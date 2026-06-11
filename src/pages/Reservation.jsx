import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import './Reservation.css';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Reservation() {
  const location = useLocation();
  const passedState = location.state || {};

  const utilisateurData = localStorage.getItem('utilisateur');
  const utilisateurConnecte = utilisateurData ? JSON.parse(utilisateurData) : null;

  const [salons, setSalons] = useState([]);
  const [prestations, setPrestations] = useState([]);
  const [employesDuSalon, setEmployesDuSalon] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableHours, setAvailableHours] = useState([]);

  const [pourUnProche, setPourUnProche] = useState(false);

  const [formData, setFormData] = useState({
    salonId: passedState.salonId || '',
    prestationId: passedState.prestationId || '',
    employeId: '',
    date: '',
    heure: '',
    nom: utilisateurConnecte ? utilisateurConnecte.nom : '',
    prenom: utilisateurConnecte ? utilisateurConnecte.prenom : '',
    email: utilisateurConnecte ? utilisateurConnecte.email : '',
    telephone: utilisateurConnecte && utilisateurConnecte.telephone ? utilisateurConnecte.telephone : ''
  });

  const [step, setStep] = useState(() => {
    if (passedState.salonId && passedState.prestationNom) return 3;
    if (passedState.salonId) return 2;
    return 1;
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [resSalons, resPrestas] = await Promise.all([
          fetch('https://groupe-atelier-devoir-bilan.onrender.com/api/salons'),
          fetch('https://groupe-atelier-devoir-bilan.onrender.com/api/prestations')
        ]);
        const salonsData = await resSalons.json();
        const prestasData = await resPrestas.json();
        
        setSalons(salonsData);
        setPrestations(prestasData);
        
        if (passedState.prestationNom) {
          const laPresta = prestasData.find(p => p.nom === passedState.prestationNom);
          if (laPresta) {
            setFormData(prev => ({ ...prev, prestationId: laPresta.id }));
          }
        }
        
        if (passedState.salonId) {
          const leSalon = salonsData.find(s => s.id === passedState.salonId);
          if (leSalon) {
            const resDetail = await fetch(`https://groupe-atelier-devoir-bilan.onrender.com/api/salons/${leSalon.slug}`);
            const salonDetail = await resDetail.json();
            setEmployesDuSalon(salonDetail.employes || []);
          }
        }
      } catch (error) {
        console.error("Erreur de chargement :", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [passedState.salonId, passedState.prestationNom]);

  const handleSalonSelect = async (salonId) => {
    setFormData({ ...formData, salonId: salonId, employeId: '' }); 
    
    const leSalon = salons.find(s => s.id === salonId);
    if (leSalon) {
      try {
        const res = await fetch(`https://groupe-atelier-devoir-bilan.onrender.com/api/salons/${leSalon.slug}`);
        const data = await res.json();
        setEmployesDuSalon(data.employes || []);
      } catch (error) {
        console.error("Erreur récupération employés:", error);
      }
    }
  };

  const handleSelect = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCheckboxChange = (e) => {
    const isChecked = e.target.checked;
    setPourUnProche(isChecked);

    if (isChecked) {
      setFormData({ ...formData, nom: '', prenom: '' });
    } else {
      setFormData({ 
        ...formData, 
        nom: utilisateurConnecte ? utilisateurConnecte.nom : '', 
        prenom: utilisateurConnecte ? utilisateurConnecte.prenom : '' 
      });
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const reponse = await fetch('https://groupe-atelier-devoir-bilan.onrender.com/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          utilisateurId: utilisateurConnecte ? utilisateurConnecte.id : null 
        })
      });

      if (!reponse.ok) throw new Error("Erreur lors de la réservation");

      nextStep();
    } catch (error) {
      alert("Une erreur est survenue. Le serveur n'est pas encore prêt !");
      console.error(error);
    }
  };

  // crenaux dynamique
  useEffect(() => {
    if (formData.date && formData.employeId) {
      const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const nomDuJour = jours[new Date(formData.date).getDay()];

      const employe = employesDuSalon.find(e => e.id === parseInt(formData.employeId));
      
      if (employe && employe.horaires) {
        const horairesDuJour = employe.horaires.find(h => h.jour === nomDuJour);

        if (horairesDuJour) {
          //  creneaux tout les 30mins
          let creneaux = [];
          let heureActuelle = new Date(`1970-01-01T${horairesDuJour.heure_debut}:00`);
          let heureFin = new Date(`1970-01-01T${horairesDuJour.heure_fin}:00`);

          // --- SÉCURITÉ : Vérifier l'heure actuelle ---
          const maintenant = new Date();
          const dateSelectionnee = new Date(formData.date);
          const estAujourdhui = dateSelectionnee.toDateString() === maintenant.toDateString();

          while (heureActuelle < heureFin) {
            const heureTexte = heureActuelle.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ':');
            
            let heureValide = true;

            // Si  aujourd'hui, on masque les heures passées
            if (estAujourdhui) {
              if (heureActuelle.getHours() < maintenant.getHours()) {
                heureValide = false; // heure  passée
              } else if (heureActuelle.getHours() === maintenant.getHours() && heureActuelle.getMinutes() <= maintenant.getMinutes()) {
                heureValide = false; // même heure, mais minute passée
              }
            }

            if (heureValide) {
              creneaux.push(heureTexte);
            }

            heureActuelle.setMinutes(heureActuelle.getMinutes() + 30); // Saut de 30 min
          }
          setAvailableHours(creneaux);
        } else {
          setAvailableHours([]); 
        }
      }
    }
  }, [formData.date, formData.employeId, employesDuSalon]);

  useDocumentTitle('Prendre RDV');

  const availablePrestations = prestations.filter(presta => 
    presta.salons && presta.salons.some(s => s.id === formData.salonId)
  );

  // presta preselectionné
  const selectedPresta = prestations.find(p => p.id === formData.prestationId);

  // verif si salon prorpose
  const isSalonAvailableForPresta = (salonId) => {
    if (!selectedPresta) return true; // si pas de presta = tout les salons
    return selectedPresta.salons && selectedPresta.salons.some(s => s.id === salonId);
  };

  // trie : dispo haut, indispo bas
  const sortedSalons = [...salons].sort((a, b) => {
    const aDispo = isSalonAvailableForPresta(a.id);
    const bDispo = isSalonAvailableForPresta(b.id);
    if (aDispo === bDispo) return 0;
    return aDispo ? -1 : 1; // dispo = true = -1
  });


  if (isLoading) return <div className="reservation-loading">Chargement de la réservation...</div>;

  return (
    <div className="reservation-container">
      <div className="reservation-header">
        <h1>Prendre Rendez-vous</h1>
        <p>Réservez votre moment de détente en quelques clics.</p>
      </div>

      {step < 6 && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(step / 5) * 100}%` }}></div>
          </div>
          <p className="step-indicator">Étape {step} sur 5</p>
        </div>
      )}

      <div className="wizard-card">
        
        {/* salon */}
        {step === 1 && (
          <div className="step-content">
            <h2>1. Choisissez votre salon</h2>

            {/* contexte */}
            {selectedPresta && passedState.prestationNom && (
              <div className="context-banner">
                <p>
                   Vous réservez pour : <strong>{selectedPresta.nom}</strong>
                </p>
                <button 
                  className="btn-cancel-filter"
                  onClick={() => {
                    setFormData({...formData, prestationId: ''});
                    window.history.replaceState({}, document.title); 
                  }}
                >
                  Changer de soin
                </button>
              </div>
            )}

            <div className="options-grid">
              {sortedSalons.map(salon => {
                const isDispo = isSalonAvailableForPresta(salon.id);
                
                return (
                  <div 
                    key={salon.id} 
                    // classe si pas dispo
                    className={`option-card ${formData.salonId === salon.id ? 'selected' : ''} ${!isDispo ? 'unavailable' : ''}`}
                    onClick={() => isDispo ? handleSalonSelect(salon.id) : null}
                  >
                    <h3>{salon.nom}</h3>
                    <p>{salon.adresse}</p>
                    
                    {/* explication */}
                    {!isDispo && (
                      <span className="unavailable-message">
                        <i className="bi bi-x-circle"></i> Non disponible pour ce soin
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <button className="btn-next single-action" disabled={!formData.salonId} onClick={nextStep}>
              Suivant
            </button>
          </div>
        )}

        {/* prestation */}
        {step === 2 && (
          <div className="step-content">
            <h2>2. Choisissez votre prestation</h2>
            <div className="options-grid list-view">
              {availablePrestations.map(presta => (
                <div 
                  key={presta.id} 
                  className={`option-card ${formData.prestationId === presta.id ? 'selected' : ''}`}
                  onClick={() => handleSelect('prestationId', presta.id)}
                >
                  <div className="presta-info">
                    <h3>{presta.nom}</h3>
                    <p>{presta.duree} min</p>
                  </div>
                  <span className="presta-price">{presta.prix} €</span>
                </div>
              ))}
              {availablePrestations.length === 0 && <p>Aucune prestation disponible pour ce salon.</p>}
            </div>
            <div className="wizard-actions">
              <button className="btn-prev" onClick={prevStep}>Retour</button>
              <button className="btn-next" disabled={!formData.prestationId} onClick={nextStep}>Suivant</button>
            </div>
          </div>
        )}

        {/* coiffeur */}
        {step === 3 && (
          <div className="step-content">
            <h2>3. Choisissez votre coiffeur</h2>
            <div className="options-grid">
              {employesDuSalon.map(membre => (
                <div 
                  key={membre.id} 
                  className={`option-card ${formData.employeId === membre.id ? 'selected' : ''}`}
                  onClick={() => handleSelect('employeId', membre.id)}
                >
                  <h3>{membre.nom}</h3>
                  <p>{membre.role}</p>
                </div>
              ))}
              {employesDuSalon.length === 0 && <p>L'équipe est en cours de recrutement.</p>}
            </div>
            <div className="wizard-actions">
              <button className="btn-prev" onClick={prevStep}>Retour</button>
              <button className="btn-next" disabled={!formData.employeId} onClick={nextStep}>Suivant</button>
            </div>
          </div>
        )}

        {/* date heure */}
        {step === 4 && (
          <div className="step-content">
            <h2>4. Date et Heure</h2>
            <div className="datetime-container">
              <div className="form-group">
                <label>Date du rendez-vous</label>
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={(e) => handleSelect('date', e.target.value)} 
                  min={new Date().toISOString().split('T')[0]} 
                />
              </div>
              <div className="form-group">
                <label>Heure souhaitée</label>
                <select value={formData.heure} onChange={(e) => handleSelect('heure', e.target.value)} required disabled={!formData.date || !formData.employeId}>
                  <option value="">Choisir un horaire...</option>
                  
                  {availableHours.length > 0 ? (
                    availableHours.map(h => <option key={h} value={h}>{h}</option>)
                  ) : (
                    formData.date && formData.employeId && <option value="" disabled>Aucun créneau disponible ce jour.</option>
                  )}
                  
                </select>
              </div>
            </div>
            <div className="wizard-actions">
              <button className="btn-prev" onClick={prevStep}>Retour</button>
              <button className="btn-next" disabled={!formData.date || !formData.heure} onClick={nextStep}>Suivant</button>
            </div>
          </div>
        )}

        {/* coordonnées */}
        {step === 5 && (
          <div className="step-content">
            <h2>5. Vos coordonnées</h2>
            
            {utilisateurConnecte && !pourUnProche && (
              <div className="notice-success">
                <i className="bi bi-person-check-fill"></i> Bonjour {utilisateurConnecte.prenom}, vos informations ont été pré-remplies !
              </div>
            )}

            {utilisateurConnecte && (
              <div className="checkbox-wrapper">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    className="checkbox-input"
                    checked={pourUnProche} 
                    onChange={handleCheckboxChange} 
                  />
                  Je prends rendez-vous pour une autre personne (enfant, conjoint...)
                </label>
              </div>
            )}

            <form onSubmit={handleSubmit} className="details-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Prénom {pourUnProche && "de la personne"}</label>
                  <input required type="text" value={formData.prenom} onChange={(e) => handleSelect('prenom', e.target.value)} placeholder={pourUnProche ? "Ex: Léo" : ""} />
                </div>
                <div className="form-group">
                  <label>Nom {pourUnProche && "de la personne"}</label>
                  <input required type="text" value={formData.nom} onChange={(e) => handleSelect('nom', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Email de confirmation</label>
                <input required type="email" value={formData.email} onChange={(e) => handleSelect('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input required type="tel" value={formData.telephone} onChange={(e) => handleSelect('telephone', e.target.value)} />
              </div>
              
              <div className="wizard-actions">
                <button type="button" className="btn-prev" onClick={prevStep}>Retour</button>
                <button type="submit" className="btn-submit">Confirmer le RDV</button>
              </div>
            </form>
          </div>
        )}

        {/* confirmation */}
        {step === 6 && (
          <div className="step-content success-step">
            <i className="bi bi-check-circle-fill success-icon"></i>
            <h2>Rendez-vous Confirmé !</h2>
            <p>Le rendez-vous pour {formData.prenom} est bien enregistré le <strong>{formData.date.split('-').reverse().join('/')} à {formData.heure}</strong>.</p>
            <p>Un email de confirmation vient de vous être envoyé à <em>{formData.email}</em>.</p>
            
            <Link to="/" className="btn-home-return">Retour à l'accueil</Link>
          </div>
        )}

      </div>
    </div>
  );
}