function HomePage() {
  return (
    <div className="hero-section">
      <h1 className="hero-title">
        Welcome to Capstone Project
      </h1>
      <p className="hero-subtitle">
        A professional, secure monorepo built using NestJS (Backend) + Prisma ORM + Supabase, and ReactJS (Frontend) + Vite.
      </p>
      <div className="hero-actions">
        <a
          href="https://nestjs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
        >
          NestJS Docs
        </a>
        <a
          href="https://vite.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
        >
          Vite Docs
        </a>
      </div>
    </div>
  );
}

export default HomePage;
