import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="page-wrap">
    <div className="empty-state">
      <h1>404</h1>
      <p>This page doesn't exist.</p>
      <Link to="/" className="btn-primary inline">Back to chats</Link>
    </div>
  </div>
);

export default NotFound;