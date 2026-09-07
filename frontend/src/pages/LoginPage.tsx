import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem('token', 'dummy-jwt-token');
    navigate('/');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2 className="auth-card-title">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="name@domain.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-submit">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
