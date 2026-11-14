import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    <div className={styles.notFound}>
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        }
      />
    </div>
  );
}
