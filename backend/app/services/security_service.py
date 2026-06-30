"""
Security Service — failed login tracking, IP blocking, session management.
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import SecurityLog
from app.models.notification import BlockedIP


class SecurityService:
    """Handles security-related operations."""

    async def log_security_event(
        self,
        db: AsyncSession,
        event_type: str,
        user_id: int = None,
        ip_address: str = None,
        details: dict = None,
        severity: str = "low",
    ):
        """Log a security event."""
        log = SecurityLog(
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            details=details or {},
            severity=severity,
        )
        db.add(log)

    async def get_failed_logins(self, db: AsyncSession, hours: int = 24) -> list[dict]:
        """Get recent failed login attempts."""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        result = await db.execute(
            select(SecurityLog).where(
                and_(
                    SecurityLog.event_type == "failed_login",
                    SecurityLog.timestamp >= since,
                )
            ).order_by(SecurityLog.timestamp.desc()).limit(100)
        )
        logs = result.scalars().all()
        return [
            {
                "id": log.id,
                "user_id": log.user_id,
                "ip_address": log.ip_address,
                "details": log.details,
                "severity": log.severity,
                "timestamp": log.timestamp.isoformat(),
            }
            for log in logs
        ]

    async def is_ip_blocked(self, db: AsyncSession, ip: str) -> bool:
        """Check if an IP is blocked."""
        result = await db.execute(
            select(BlockedIP).where(BlockedIP.ip_address == ip)
        )
        blocked = result.scalar_one_or_none()
        if not blocked:
            return False
        if blocked.expires_at and blocked.expires_at < datetime.now(timezone.utc):
            # Expired block — remove it
            await db.delete(blocked)
            return False
        return True

    async def block_ip(self, db: AsyncSession, ip: str, reason: str = "", hours: int = None):
        """Block an IP address."""
        expires = None
        if hours:
            expires = datetime.now(timezone.utc) + timedelta(hours=hours)

        existing = await db.execute(select(BlockedIP).where(BlockedIP.ip_address == ip))
        blocked = existing.scalar_one_or_none()

        if blocked:
            blocked.reason = reason
            blocked.expires_at = expires
        else:
            db.add(BlockedIP(
                ip_address=ip,
                reason=reason,
                blocked_by_admin=True,
                expires_at=expires,
            ))

    async def unblock_ip(self, db: AsyncSession, ip: str):
        """Unblock an IP address."""
        await db.execute(delete(BlockedIP).where(BlockedIP.ip_address == ip))

    async def get_security_logs(
        self, db: AsyncSession, limit: int = 50, severity: str = None
    ) -> list[dict]:
        """Get security logs with optional severity filter."""
        query = select(SecurityLog).order_by(SecurityLog.timestamp.desc()).limit(limit)
        if severity:
            query = query.where(SecurityLog.severity == severity)

        result = await db.execute(query)
        logs = result.scalars().all()
        return [
            {
                "id": log.id,
                "event_type": log.event_type,
                "user_id": log.user_id,
                "ip_address": log.ip_address,
                "details": log.details,
                "severity": log.severity,
                "timestamp": log.timestamp.isoformat(),
            }
            for log in logs
        ]

    async def check_brute_force(self, db: AsyncSession, ip: str, threshold: int = 5) -> bool:
        """Check if an IP has too many failed logins (brute force detection)."""
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        count = await db.scalar(
            select(func.count(SecurityLog.id)).where(
                and_(
                    SecurityLog.event_type == "failed_login",
                    SecurityLog.ip_address == ip,
                    SecurityLog.timestamp >= one_hour_ago,
                )
            )
        )
        return (count or 0) >= threshold


# Singleton
security_service = SecurityService()
