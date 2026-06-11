import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import './Admin.css';

export default function Admin() {
  useDocumentTitle('Gestion | Groupe l\'Atelier');
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('prestations');
  const [prestations, setPrestations] = useState([]);
  const [salons, setSalons] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [formPresta, setFormPresta] = useState({ id: null, nom: '', description: '', prix: '', duree: '', salonIds: [] });
  const [isEditingPresta, setIsEditingPresta] = useState(false);

  const [formSalon, setFormSalon] = useState({ id: null, nom: '', adresse: '', telephone: '', image: '', presentationImage: '', slug: '', description: '', horaires: '' });
  const [isEditingSalon, setIsEditingSalon] = useState(false);

  

  const [formStaff, setFormStaff] = useState({ nom: '', role: 'Coiffeur', salonId: '' });
  const [formHoraire, setFormHoraire] = useState({ jour: 'Lundi', heure_debut: '09:00', heure_fin: '18:00', employeId: '' });
  const [reservations, setReservations] = useState([]);
  const [filtreSalon, setFiltreSalon] = useState("TOUS");
  const [filtreCoiffeur, setFiltreCoiffeur] = useState("TOUS");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('utilisateur'));
    if (!storedUser || storedUser.role !== 'ADMIN') {
      navigate('/');
    } else {
      fetchData();
    }
  }, [navigate]);

  const fetchData = async () => {
    try {
      const resP = await fetch('https://groupe-atelier-devoir-bilan.onrender.com/api/prestations', { cache: 'no-store' });
      const resS = await fetch('https://groupe-atelier-devoir-bilan.onrender.com/api/salons', { cache: 'no-store' });
      const resE = await fetch('https://groupe-atelier-devoir-bilan.onrender.com/api/employes', { cache: 'no-store' });
      const resR = await fetch('https://groupe-atelier-devoir-bilan.onrender.com/api/admin/reservations');

      if (resP.ok) setPrestations(await resP.json());
      if (resS.ok) setSalons(await resS.json());
      if (resE.ok) setEmployes(await resE.json());
      if (resR.ok) setReservations(await resR.json());
    } catch (error) {
      console.error("Erreur API :", error);
    }
  };

  // actions prestation
  const handlePrestaSubmit = async (e) => {
    e.preventDefault();
    const url = isEditingPresta ? `https://groupe-atelier-devoir-bilan.onrender.com/api/prestations/${formPresta.id}` : 'https://groupe-atelier-devoir-bilan.onrender.com/api/prestations';
    const method = isEditingPresta ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formPresta) });
    setFormPresta({ id: null, nom: '', description: '', prix: '', duree: '', salonIds: [] });
    setIsEditingPresta(false);
    fetchData();
  };

  const handlePrestaDelete = async (id) => {
    if (window.confirm("Supprimer ?")) {
      await fetch(`https://groupe-atelier-devoir-bilan.onrender.com/api/prestations/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  // actions salon
  const handleSalonSubmit = async (e) => {
    e.preventDefault();
    const url = isEditingSalon ? `https://groupe-atelier-devoir-bilan.onrender.com/api/salons/${formSalon.id}` : 'https://groupe-atelier-devoir-bilan.onrender.com/api/salons';
    const method = isEditingSalon ? 'PUT' : 'POST';
    const { id, ...donnees } = formSalon;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(donnees) });

    // reset complet
    setFormSalon({ id: null, nom: '', adresse: '', telephone: '', image: '', presentationImage: '', slug: '', description: '', horaires: '' });
    setIsEditingSalon(false);
    fetchData();
  };

  const handleSalonDelete = async (id) => {
    if (window.confirm("Supprimer le salon ?")) {
      await fetch(`https://groupe-atelier-devoir-bilan.onrender.com/api/salons/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  // filtrage rdv
  const reservationsFiltrees = reservations.filter((rdv) => {
    const correspondSalon = filtreSalon === "TOUS" || rdv.employe.salon.nom === filtreSalon;
    const correspondCoiffeur = filtreCoiffeur === "TOUS" || rdv.employe.nom === filtreCoiffeur;
    return correspondSalon && correspondCoiffeur;
  });


  // actions staff planning
  const handleAddStaff = async (e) => {
    e.preventDefault();
    await fetch('https://groupe-atelier-devoir-bilan.onrender.com/api/employes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formStaff) });
    setFormStaff({ nom: '', role: 'Coiffeur', salonId: '' });
    fetchData();
  };

  const handleAddHoraire = async (e) => {
    e.preventDefault();
    await fetch('https://groupe-atelier-devoir-bilan.onrender.com/api/horaires', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formHoraire) });
    fetchData();
  };

  const deleteHoraire = async (id) => {
    await fetch(`https://groupe-atelier-devoir-bilan.onrender.com/api/horaires/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1><i className="bi bi-gear-fill"></i> Panneau d'Administration</h1>
        <p>Gérez le catalogue, les salons et vos équipes.</p>
      </div>

      <div className="admin-tabs">
        <button onClick={() => setActiveTab('prestations')} className={activeTab === 'prestations' ? 'active' : ''}>
          <i className="bi bi-scissors"></i> Prestations
        </button>
        <button onClick={() => setActiveTab('salons')} className={activeTab === 'salons' ? 'active' : ''}>
          <i className="bi bi-shop"></i> Salons
        </button>
        <button onClick={() => setActiveTab('staff')} className={activeTab === 'staff' ? 'active' : ''}>
          <i className="bi bi-calendar-week"></i> Coiffeurs & Planning
        </button>
        <button onClick={() => setActiveTab('reservations')} className={activeTab === 'reservations' ? 'active' : ''}>
          <i className="bi bi-calendar-check"></i> Planning Global
        </button>
      </div>

      <div className="admin-content">


       {/* onglet coiffeur rdv */}
        {activeTab === 'reservations' && (
          <div className="admin-table-card">
            <h2><i className="bi bi-calendar3"></i> Liste des Rendez-vous</h2>

            {/* filtre */}
            <div className="filtres-section" style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <div>
                <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filtrer par Salon :</label>
                <select value={filtreSalon} onChange={(e) => setFiltreSalon(e.target.value)} style={{ padding: '5px', borderRadius: '4px' }}>
                  <option value="TOUS">Tous les salons</option>
                  <option value="L'atelier mixte">L'atelier mixte</option>
                  <option value="The Old School">The Old School</option>
                  <option value="L'Essence de soi">L'Essence de soi</option>
                </select>
              </div>

              <div>
                <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filtrer par Coiffeur :</label>
                <select value={filtreCoiffeur} onChange={(e) => setFiltreCoiffeur(e.target.value)} style={{ padding: '5px', borderRadius: '4px' }}>
                  <option value="TOUS">Tous les coiffeurs</option>
                  <option value="Marjorie">Marjorie</option>
                  <option value="Ringo">Ringo</option>
                  <option value="Coralie">Coralie</option>
                </select>
              </div>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date & Heure</th>
                  <th>Client</th>
                  <th>Prestation</th>
                  <th>Coiffeur / Salon</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {reservationsFiltrees.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.date_rdv).toLocaleDateString()} à {r.heure_rdv}</td>
                    <td>{r.utilisateur.prenom} {r.utilisateur.nom}</td>
                    <td>{r.prestation.nom}</td>
                    <td><strong>{r.employe.nom}</strong> ({r.employe.salon.nom})</td>
                    <td><span className={`status-badge ${r.statut.toLowerCase()}`}>{r.statut}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* onglet presta */}
        {activeTab === 'prestations' && (
          <div className="admin-layout">
            <div className="admin-form-card">
              <h2><i className="bi bi-plus-circle"></i> {isEditingPresta ? "Modifier" : "Ajouter"}</h2>
              <form onSubmit={handlePrestaSubmit} className="admin-form">
                <div className="form-group">
                  <label>Nom</label>
                  <input type="text" value={formPresta.nom} onChange={e => setFormPresta({ ...formPresta, nom: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={formPresta.description} onChange={e => setFormPresta({ ...formPresta, description: e.target.value })} rows="3" required></textarea>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Prix</label><input type="number" value={formPresta.prix} onChange={e => setFormPresta({ ...formPresta, prix: e.target.value })} step="0.01" required /></div>
                  <div className="form-group"><label>Durée</label><input type="number" value={formPresta.duree} onChange={e => setFormPresta({ ...formPresta, duree: e.target.value })} required /></div>
                </div>

                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label>Salons proposant cette prestation</label>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {salons.map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formPresta.salonIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormPresta({ ...formPresta, salonIds: [...formPresta.salonIds, s.id] });
                            } else {
                              setFormPresta({ ...formPresta, salonIds: formPresta.salonIds.filter(id => id !== s.id) });
                            }
                          }}
                        />
                        {s.nom}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="admin-form-actions">
                  {isEditingPresta && <button type="button" className="btn-cancel" onClick={() => setIsEditingPresta(false)}>Annuler</button>}
                  <button type="submit" className="btn-save">Enregistrer</button>
                </div>
              </form>
            </div>
            <div className="admin-table-card">
              <table className="admin-table">
                <thead><tr><th>Nom</th><th>Prix</th><th>Actions</th></tr></thead>
                <tbody>
                  {prestations.map(p => (
                    <tr key={p.id}>
                      <td>{p.nom}</td><td>{p.prix} €</td>
                      <td className="actions-cell">
                        <button onClick={() => {
                          setFormPresta({ ...p, salonIds: p.salons ? p.salons.map(s => s.id) : [] });
                          setIsEditingPresta(true);
                        }} className="btn-icon edit"><i className="bi bi-pencil-fill"></i></button>
                        <button onClick={() => handlePrestaDelete(p.id)} className="btn-icon delete"><i className="bi bi-trash-fill"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* onglet salons */}
        {activeTab === 'salons' && (
          <div className="admin-grid">
            <div className="admin-form-card">
              <h2><i className="bi bi-plus-circle"></i> {isEditingSalon ? "Modifier le Salon" : "Nouveau Salon"}</h2>
              <form onSubmit={handleSalonSubmit} className="admin-form">
                <div className="form-group">
                  <label>Nom</label>
                  <input type="text" value={formSalon.nom} onChange={e => setFormSalon({ ...formSalon, nom: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Slug</label><input type="text" value={formSalon.slug} onChange={e => setFormSalon({ ...formSalon, slug: e.target.value })} required /></div>
                  <div className="form-group"><label>Tel</label><input type="tel" value={formSalon.telephone} onChange={e => setFormSalon({ ...formSalon, telephone: e.target.value })} required /></div>
                </div>
                <div className="form-group"><label>Adresse</label><input type="text" value={formSalon.adresse} onChange={e => setFormSalon({ ...formSalon, adresse: e.target.value })} required /></div>
                <div className="form-group"><label>Image devanture</label><input type="text" value={formSalon.image || ''} onChange={e => setFormSalon({ ...formSalon, image: e.target.value })} /></div>
                <div className="form-group"><label>Image fond</label><input type="text" value={formSalon.presentationImage || ''} onChange={e => setFormSalon({ ...formSalon, presentationImage: e.target.value })} /></div>
                <div className="form-group"><label>Description</label><textarea value={formSalon.description || ''} onChange={e => setFormSalon({ ...formSalon, description: e.target.value })} rows="4"></textarea></div>

                <div className="form-group">
                  <label>Horaires d'ouverture du salon</label>
                  <textarea
                    placeholder="Ex: Lundi : Fermé&#10;Mardi au Samedi : 09h - 19h"
                    value={formSalon.horaires || ''}
                    onChange={e => setFormSalon({ ...formSalon, horaires: e.target.value })}
                    rows="4">
                  </textarea>
                </div>

                <div className="admin-form-actions">
                  {isEditingSalon && <button type="button" className="btn-cancel" onClick={() => setIsEditingSalon(false)}>Annuler</button>}
                  <button type="submit" className="btn-save">Enregistrer</button>
                </div>
              </form>
            </div>
            <div className="admin-table-card">
              {salons.map(s => (
                <div key={s.id} className="admin-list-item">
                  <div className="item-info"><strong>{s.nom}</strong><span>{s.adresse}</span></div>
                  <div className="actions-cell">
                    <button onClick={() => { setFormSalon(s); setIsEditingSalon(true); }} className="btn-icon edit"><i className="bi bi-pencil-fill"></i></button>
                    <button onClick={() => handleSalonDelete(s.id)} className="btn-icon delete"><i className="bi bi-trash-fill"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* onglet staff */}
        {activeTab === 'staff' && (
          <div className="admin-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="admin-form-card">
                <h2>Ajouter Coiffeur</h2>
                <form onSubmit={handleAddStaff} className="admin-form">
                  <input type="text" placeholder="Nom" value={formStaff.nom} onChange={e => setFormStaff({ ...formStaff, nom: e.target.value })} required />
                  <select value={formStaff.salonId} onChange={e => setFormStaff({ ...formStaff, salonId: e.target.value })} required>
                    <option value="">Choisir Salon...</option>
                    {salons.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                  <button type="submit" className="btn-save">Ajouter</button>
                </form>
              </div>
              <div className="admin-form-card">
                <h2>Ajouter Créneau</h2>
                <form onSubmit={handleAddHoraire} className="admin-form">
                  <select value={formHoraire.employeId} onChange={e => setFormHoraire({ ...formHoraire, employeId: e.target.value })} required>
                    <option value="">Coiffeur...</option>
                    {employes.map(emp => <option key={emp.id} value={emp.id}>{emp.nom}</option>)}
                  </select>
                  <select value={formHoraire.jour} onChange={e => setFormHoraire({ ...formHoraire, jour: e.target.value })}>
                    {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                  <div className="form-row">
                    <input type="time" value={formHoraire.heure_debut} onChange={e => setFormHoraire({ ...formHoraire, heure_debut: e.target.value })} />
                    <input type="time" value={formHoraire.heure_fin} onChange={e => setFormHoraire({ ...formHoraire, heure_fin: e.target.value })} />
                  </div>
                  <button type="submit" className="btn-save">Ajouter créneau</button>
                </form>
              </div>
            </div>
            <div className="admin-table-card">
              {employes.map(emp => (
                <div key={emp.id} className="staff-planning-box">
                  <div className="staff-planning-header"><strong>{emp.nom}</strong><span>{emp.salon?.nom}</span></div>
                  <ul className="horaire-list">
                    {emp.horaires?.map(h => (
                      <li key={h.id} className="horaire-item">
                        {h.jour} : {h.heure_debut}-{h.heure_fin}
                        <button onClick={() => deleteHoraire(h.id)} className="btn-del-small"><i className="bi bi-trash-fill"></i></button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}