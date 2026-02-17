// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// const usersRoutes = require('./routes/users');
// const authRoutes = require('./routes/auth');
// const centresRoutes = require('./routes/centres'); // Ajouter cette ligne
// const formationsRoutes = require('./routes/formations');
// const etudiantsRoutes = require('./routes/etudiants');
// const inscriptionsRoutes = require('./routes/inscriptionRoutes');
// const paiementsRoutes = require('./routes/paiements');
// const droitsRoutes = require('./routes/droits');
// const depensesRoutes = require('./routes/depenses');
// const depensesObligRoutes = require('./routes/depensesObligatoires');
// const parametresRoutes = require('./routes/parametres');
// const mailRoutes = require('./routes/mail');
// const livresRoutes = require('./routes/livres');

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(cors());
// app.use(express.json());

// const typesMontantsRoutes = require('./routes/typesMontants.routes');
// const montantsAutresRoutes = require('./routes/montantsAutres.routes');

// app.use('/api/types-montants', typesMontantsRoutes);
// app.use('/api/montants-autres', montantsAutresRoutes);

// // Routes
// app.use('/api/users', usersRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/centres', centresRoutes); 
// app.use('/api/formations', formationsRoutes);
// app.use('/api/etudiants', etudiantsRoutes); 
// app.use('/api/inscriptions', inscriptionsRoutes);
// app.use('/api/paiements', paiementsRoutes);
// app.use('/api/droits', droitsRoutes);
// app.use('/api/depenses', depensesRoutes);
// app.use('/api/depenses_obligatoires', depensesObligRoutes);
// app.use('/api/parametres', parametresRoutes);
// app.use('/api/mail', mailRoutes);
// app.use('/api/livres', livresRoutes);

// // Test
// app.get('/', (req, res) => res.send('Backend Node.js + PostgreSQL fonctionne !'));

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



// app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import des routes
const usersRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const centresRoutes = require('./routes/centres');
const formationsRoutes = require('./routes/formations');
const etudiantsRoutes = require('./routes/etudiants');
const inscriptionsRoutes = require('./routes/inscriptionRoutes');
const paiementsRoutes = require('./routes/paiements');
const droitsRoutes = require('./routes/droits');
const depensesRoutes = require('./routes/depenses');
const depensesObligRoutes = require('./routes/depensesObligatoires');
const parametresRoutes = require('./routes/parametres');
const mailRoutes = require('./routes/mail');
const livresRoutes = require('./routes/livres');
const typesMontantsRoutes = require('./routes/typesMontants.routes');
const montantsAutresRoutes = require('./routes/montantsAutres.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// 🌐 Configuration CORS selon environnement
const allowedOrigins = process.env.NODE_ENV === 'production'
        ? [
                'https://ge.cfpm-de-madagascar.com',
                'http://ge.cfpm-de-madagascar.com'
            ] // production avec HTTP et HTTPS
        : ['http://localhost:5173'];
    
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    credentials: true
}));

// Middleware
app.use(express.json());

// Routes principales
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/centres', centresRoutes);
app.use('/api/formations', formationsRoutes);
app.use('/api/etudiants', etudiantsRoutes);
app.use('/api/inscriptions', inscriptionsRoutes);
app.use('/api/paiements', paiementsRoutes);
app.use('/api/droits', droitsRoutes);
app.use('/api/depenses', depensesRoutes);
app.use('/api/depenses_obligatoires', depensesObligRoutes);
app.use('/api/parametres', parametresRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/livres', livresRoutes);
app.use('/api/types-montants', typesMontantsRoutes);
app.use('/api/montants-autres', montantsAutresRoutes);

// Route test
app.get('/', (req, res) => res.send('Backend Node.js + PostgreSQL fonctionne !'));

// Démarrage serveur
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));