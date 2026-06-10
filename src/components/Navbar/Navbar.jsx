import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Anti Page Blanche
  let utilisateur = null;
  try {
    const utilisateurData = localStorage.getItem('utilisateur');
    if (utilisateurData && utilisateurData !== "undefined") {
      utilisateur = JSON.parse(utilisateurData);
    }
  } catch (error) {
    console.error("Erreur de lecture de l'utilisateur, on nettoie la mémoire :", error);
    localStorage.removeItem('utilisateur'); // On vide la mémoire corrompue
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleDeconnexion = () => {
    localStorage.removeItem('utilisateur');
    window.location.href = '/';
  };

  return (
    <header className="navbar-container">

      {/* GAUCHE Desktop */}
      <div className={`nav-links-left ${isMenuOpen ? 'open' : ''}`}>
        <Link to="/nos-salons" onClick={closeMenu}>Nos Salons</Link>
        <Link to="/prestations" onClick={closeMenu}>Prestations</Link>
      </div>

      {/* LOGO Centre desktop, gauche mobile) */}
      <div className="logo-container">
        <Link to="/" className="logo" onClick={closeMenu}>Le Groupe l'Atelier</Link>
      </div>

      {/* BURGER */}
      <button className="burger-menu" onClick={toggleMenu} aria-label="Menu">
        {isMenuOpen ? '✖' : '☰'}
      </button>

      {/* DROITE (Desktop) / MENU (Mobile) */}
      <div className={`nav-links-right ${isMenuOpen ? 'open' : ''}`}>

        <Link to="/nos-salons" className="mobile-only" onClick={closeMenu}>Nos Salons</Link>
        <Link to="/prestations" className="mobile-only" onClick={closeMenu}>Prestations</Link>
        <Link to="/reservation" onClick={closeMenu}>Prendre RDV</Link>

        {/* etat connexion */}
        {utilisateur ? (
          <>
            {/* bouton admin */}
            {utilisateur.role === 'ADMIN' && (
              <Link to="/admin" className="btn-admin-nav" onClick={closeMenu}>
                <i className="bi bi-shield-lock-fill"></i> Admin
              </Link>
            )}

            {/* boutton espace */}
            <Link to="/dashboard" className="btn-mon-espace" onClick={closeMenu}>
              <i className="bi bi-person-circle"></i> Mon Espace
            </Link>

            <button onClick={handleDeconnexion} className="logout-btn">
              Déconnexion
            </button>
          </>
        ) : (
          <Link to="/compte" onClick={closeMenu}>Mon compte</Link>
        )}

        {/* Mentions Légales burger mobile */}
        <Link to="/mentions-legales" className="mobile-only" onClick={closeMenu}>Mentions Légales</Link>
      </div>

    </header>
  );
}