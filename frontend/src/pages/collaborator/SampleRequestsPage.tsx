import { Navigate } from 'react-router-dom';

export default function SampleRequestsPage() {
  return <Navigate to="/collaborator/collaboration?tab=samples" replace />;
}
