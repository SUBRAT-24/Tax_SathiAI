import { motion } from 'framer-motion';
import { MessageSquare, FileText, Calculator, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui';
import { pageVariants } from '../animations/variants';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const stats = [
    { label: 'Total Queries', value: '24', icon: MessageSquare },
    { label: 'Documents', value: '5', icon: FileText },
    { label: 'Tools Used', value: '12', icon: Calculator },
    { label: 'This Month', value: '+18%', icon: TrendingUp }
  ];

  const recentQueries = [
    { query: 'What is the GST rate for IT services?', time: '2 hours ago' },
    { query: 'How to claim ITC on capital goods?', time: '1 day ago' },
    { query: 'GSTR-3B filing due date for March', time: '3 days ago' }
  ];

  return (
    <motion.div
      className={styles.dashboard}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <h1 className={styles.title}>Dashboard</h1>

      <div className={styles.stats}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className={styles.statCard}>
              <div className={styles.statIcon}>
                <Icon size={20} strokeWidth={1.5} />
              </div>
              <div>
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className={styles.recent}>
        <h2 className={styles.recentTitle}>Recent Queries</h2>
        <div className={styles.recentList}>
          {recentQueries.map((item, i) => (
            <div key={i} className={styles.recentItem}>
              <p className={styles.recentQuery}>{item.query}</p>
              <span className={styles.recentTime}>{item.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
