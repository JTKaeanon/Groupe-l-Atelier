const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg'); 
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');


const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();

app.use(cors()); 
app.use(express.json());

// --- MIDDLEWARE ADMIN ---
const verifierAdmin = async (req, res, next) => {
  try {
    // récupère l'ID envoyé par Front-End 
    const userId = req.headers['x-user-id']; 
    
    if (!userId) return res.status(401).json({ erreur: "Non autorisé. Identifiant manquant." });

    // vérifie dans la BDD user existe et s'il est bien ADMIN
    const user = await prisma.utilisateur.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ erreur: "Accès refusé. Droits administrateur requis." });
    }
    
    // Bon 
    next(); 
  } catch (error) {
    res.status(500).json({ erreur: "Erreur lors de la vérification des droits." });
  }
};


// ==========================================
// TEST API
// ==========================================
app.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API du Groupe l'Atelier !" });
});

// ==========================================
// C.R.U.D SALONS
// ==========================================
app.get('/api/salons', async (req, res) => {
  try {
    const tousLesSalons = await prisma.salon.findMany();
    res.json(tousLesSalons);
  } catch (error) {
    console.error(" ERREUR API SALONS :", error);
    res.status(500).json({ erreur: "Impossible de récupérer les salons" });
  }
});

app.get('/api/salons/:slug', async (req, res) => {
  try {
    const leSlug = req.params.slug; 
    const salon = await prisma.salon.findUnique({
      where: { slug: leSlug },
      include: {
        employes: { include: { horaires: true } },
        prestations: { orderBy: { duree: 'asc' } }
      }
    });
    if (!salon) return res.status(404).json({ erreur: "Salon non trouvé" });
    res.json(salon);
  } catch (error) {
    res.status(500).json({ erreur: "Impossible de récupérer ce salon" });
  }
});

app.post('/api/salons', async (req, res) => {
  try {
    const nouveau = await prisma.salon.create({ data: req.body });
    res.status(201).json(nouveau);
  } catch (error) {
    res.status(500).json({ erreur: "Erreur lors de la création du salon." });
  }
});

app.put('/api/salons/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { id: _, ...donneesAUpdate } = req.body; 
    const maj = await prisma.salon.update({
      where: { id },
      data: donneesAUpdate
    });
    res.json(maj);
  } catch (error) {
    res.status(500).json({ erreur: "Erreur lors de la mise à jour." });
  }
});

app.delete('/api/salons/:id', async (req, res) => {
  try {
    await prisma.salon.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: "Salon supprimé" });
  } catch (error) {
    res.status(500).json({ erreur: "Erreur suppression (lié à des employés ?)" });
  }
});

// ==========================================
// C.R.U.D PRESTATIONS
// ==========================================
app.get('/api/prestations', async (req, res) => {
  try {
    const prestations = await prisma.prestation.findMany({
      include: { salons: true },
      orderBy: { duree: 'asc' }
    });
    res.json(prestations);
  } catch (error) {
    res.status(500).json({ erreur: "Impossible de récupérer les prestations" });
  }
});


app.post('/api/prestations', async (req, res) => {
  try {
    const { nom, description, prix, duree, salonIds } = req.body;
    const nouvellePrestation = await prisma.prestation.create({
      data: {
        nom,
        description,
        prix: parseFloat(prix),
        duree: parseInt(duree),
        salons: {
          connect: salonIds ? salonIds.map(id => ({ id: parseInt(id) })) : []
        }
      }
    });
    res.status(201).json(nouvellePrestation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erreur: "Impossible d'ajouter la prestation." });
  }
});

// case coché
app.put('/api/prestations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nom, description, prix, duree, salonIds } = req.body;
  
    console.log(`---> Je modifie la presta N°${id}`);
    console.log(`---> Salons cochés reçus du Front :`, salonIds);
    
    const prestationMaj = await prisma.prestation.update({
      where: { id: id },
      data: {
        nom,
        description,
        prix: parseFloat(prix),
        duree: parseInt(duree),
        salons: {
          set: salonIds ? salonIds.map(id => ({ id: parseInt(id) })) : [] 
        }
      }
    });
    
    
    res.json(prestationMaj);
  } catch (error) {
    console.error("Erreur UPDATE prestation :", error);
    res.status(500).json({ erreur: "Impossible de modifier la prestation." });
  }
});

app.delete('/api/prestations/:id', async (req, res) => {
  try {
    await prisma.prestation.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: "Prestation supprimée avec succès." });
  } catch (error) {
    res.status(500).json({ erreur: "Impossible de supprimer." });
  }
});

// ==========================================
// C.R.U.D COIFFEURS & PLANNING
// ==========================================
app.get('/api/employes', async (req, res) => {
  try {
    const employes = await prisma.employe.findMany({ 
      include: { salon: true, horaires: true } 
    });
    res.json(employes);
  } catch (error) {
    res.status(500).json({ erreur: "Erreur récupération employés." });
  }
});

app.post('/api/employes', async (req, res) => {
  try {
    const { nom, role, salonId } = req.body;
    const nouveau = await prisma.employe.create({
      data: { nom, role, salonId: parseInt(salonId) }
    });
    res.status(201).json(nouveau);
  } catch (error) {
    res.status(500).json({ erreur: "Erreur création employé." });
  }
});

app.post('/api/horaires', async (req, res) => {
  try {
    const { jour, heure_debut, heure_fin, employeId } = req.body;
    const nouvelHoraire = await prisma.horaire.create({
      data: { jour, heure_debut, heure_fin, employeId: parseInt(employeId) }
    });
    res.status(201).json(nouvelHoraire);
  } catch (error) {
    res.status(500).json({ erreur: "Erreur ajout horaire." });
  }
});

app.delete('/api/horaires/:id', async (req, res) => {
  await prisma.horaire.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ message: "Créneau supprimé" });
});

// ==========================================
// UTILISATEURS & AUTHENTIFICATION
// ==========================================
app.post('/api/inscription', async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe, telephone } = req.body;
    if (!nom || !prenom || !email || !mot_de_passe) {
      return res.status(400).json({ erreur: "Tous les champs obligatoires doivent être remplis." });
    }
    if (mot_de_passe.length < 8) {
      return res.status(400).json({ erreur: "Le mot de passe doit contenir au moins 8 caractères pour des raisons de sécurité." });
    }
    const utilisateurExistant = await prisma.utilisateur.findUnique({ where: { email: email } });
    if (utilisateurExistant) return res.status(400).json({ erreur: "Cet email est déjà utilisé." });

    const motDePasseHache = await bcrypt.hash(mot_de_passe, 10);
    const nouvelUtilisateur = await prisma.utilisateur.create({
      data: { nom, prenom, email, mot_de_passe: motDePasseHache, telephone: telephone || null, role: "CLIENT" }
    });

    res.status(201).json({ message: "Inscription réussie !", utilisateur: { id: nouvelUtilisateur.id, nom: nouvelUtilisateur.nom, email: nouvelUtilisateur.email } });
  } catch (error) {
    res.status(500).json({ erreur: "Erreur lors de l'inscription." });
  }
});

app.post('/api/connexion', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;
    const utilisateur = await prisma.utilisateur.findUnique({ where: { email: email } });
    if (!utilisateur) return res.status(401).json({ erreur: "Email ou mot de passe incorrect." });

    const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);
    if (!motDePasseValide) return res.status(401).json({ erreur: "Email ou mot de passe incorrect." });

    res.json({
      message: "Connexion réussie !",
      utilisateur: { id: utilisateur.id, nom: utilisateur.nom, prenom: utilisateur.prenom, email: utilisateur.email, role: utilisateur.role }
    });
  } catch (error) {
    res.status(500).json({ erreur: "Erreur lors de la connexion." });
  }
});

app.put('/api/utilisateurs/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { nom, prenom, email, telephone } = req.body;

    const utilisateurMisAJour = await prisma.utilisateur.update({
      where: { id: userId },
      data: { nom, prenom, email, telephone }
    });

    res.json({
      message: "Profil mis à jour !",
      utilisateur: { id: utilisateurMisAJour.id, nom: utilisateurMisAJour.nom, prenom: utilisateurMisAJour.prenom, email: utilisateurMisAJour.email, telephone: utilisateurMisAJour.telephone, role: utilisateurMisAJour.role }
    });
  } catch (error) {
    res.status(500).json({ erreur: "Impossible de mettre à jour." });
  }
});

// ==========================================
// C.R.U.D RENDEZ-VOUS
// ==========================================
app.post('/api/reservations', async (req, res) => {
  try {
    const { date, heure, prestationId, employeId, utilisateurId, nom, prenom, email, telephone } = req.body;
    let finalUtilisateurId = utilisateurId;

    if (!finalUtilisateurId) {
      let userExistant = await prisma.utilisateur.findUnique({ where: { email: email } });
      if (userExistant) {
        finalUtilisateurId = userExistant.id;
      } else {
        const fauxMotDePasse = await bcrypt.hash("invite1234", 10); 
        const newUser = await prisma.utilisateur.create({
          data: { nom, prenom, email, telephone: telephone || null, mot_de_passe: fauxMotDePasse, role: "CLIENT" }
        });
        finalUtilisateurId = newUser.id;
      }
    }

    const nouveauRdv = await prisma.rendezVous.create({
      data: {
        date_rdv: new Date(date),
        heure_rdv: heure,
        statut: "A_VENIR",
        utilisateurId: finalUtilisateurId,
        prestationId: parseInt(prestationId),
        employeId: parseInt(employeId)
      }
    });

    res.status(201).json({ message: "Réservation confirmée avec succès !", rdv: nouveauRdv });
  } catch (error) {
    res.status(500).json({ erreur: "Impossible de valider la réservation." });
  }
});

app.get('/api/utilisateurs/:id/reservations', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const mesRdv = await prisma.rendezVous.findMany({
      where: { utilisateurId: userId },
      include: { prestation: true, employe: { include: { salon: true } } },
      orderBy: { date_rdv: 'asc' }
    });
    res.json(mesRdv);
  } catch (error) {
    res.status(500).json({ erreur: "Impossible de récupérer vos rendez-vous." });
  }
});

app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const rdvId = parseInt(req.params.id);
    await prisma.rendezVous.delete({
      where: { id: rdvId }
    });
    res.json({ message: "Rendez-vous annulé avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erreur: "Impossible d'annuler le rendez-vous." });
  }
});


// RDV pour les coiffeurs (Panneau Admin)
app.get('/api/admin/reservations', verifierAdmin, async (req, res) => {
  try {
    const maintenant = new Date();

    // Auto update
    await prisma.rendezVous.updateMany({
      where: {
        date_rdv: { lt: maintenant }, // "lt" "less than" (antérieur à)
        statut: "A_VENIR"
      },
      data: {
        statut: "TERMINE"
      }
    });

    //  Liste
    const reservations = await prisma.rendezVous.findMany({
      include: {
        utilisateur: true,
        prestation: true,
        employe: {
          include: { salon: true } 
        }
      },
      orderBy: { date_rdv: 'desc' }
    });

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ erreur: "Impossible de récupérer les réservations" });
  }
});

// ==========================================
// INIT SERVEUR
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(` Serveur démarré avec succès sur http://localhost:${PORT}`);
});