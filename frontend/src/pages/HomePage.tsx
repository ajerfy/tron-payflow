import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="container">
      <h1>TRON PayFlow</h1>
      <p>Intent-based stablecoin checkout for TRON merchants.</p>
      <div className="row">
        <Link className="button" to="/merchant">Merchant Dashboard</Link>
      </div>
    </div>
  );
}
