// // const pool = require('../db');
// // const bcrypt = require('bcrypt');

// // // Récupérer tous les centres
// // const getCentres = async (req, res) => {
// //   try {
// //     const result = await pool.query('SELECT * FROM centres');
// //     res.json(result.rows);
// //   } catch (err) {
// //     console.error(err.message);
// //     res.status(500).send('Erreur serveur');
// //   }
// // };

// // // Créer un utilisateur
// // const createUser = async (req, res) => {
// //   try {
// //     const { nom, prenom, email, role, centre_id, mdp } = req.body;

// //     // Vérifier si email existe déjà
// //     const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
// //     if (check.rows.length > 0) {
// //       return res.status(400).json({ message: 'Email déjà utilisé' });
// //     }

// //     // Hacher le mot de passe
// //     const hashedPassword = await bcrypt.hash(mdp, 10);

// //     const result = await pool.query(
// //       'INSERT INTO users (nom, prenom, email, role, centre_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
// //       [nom, prenom, email, role, role === 'gerant' ? centre_id : null]
// //     );

// //     res.status(201).json({ message: 'Utilisateur créé avec succès', user: result.rows[0] });
// //   } catch (err) {
// //     console.error(err.message);
// //     res.status(500).json({ message: 'Erreur serveur' });
// //   }
// // };

// // module.exports = { createUser, getCentres };



// const { pool } = require('../db');
// const bcrypt = require('bcrypt');

// // Récupérer tous les centres
// const getCentres = async (req, res) => {
//   try {
//     const result = await pool.query('SELECT * FROM centres');
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Erreur serveur');
//   }
// };
// console.log(pool);
// // Créer un utilisateur
// const createUser = async (req, res) => {
//   try {
//     const { nom, prenom, email, role, centre_id, mdp } = req.body;

//     // Vérifier si email existe déjà
//     const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
//     if (check.rows.length > 0) 
//       return res.status(400).json({ message: 'Email déjà utilisé' });

//     // Hacher le mot de passe
//     const hashedPassword = await bcrypt.hash(mdp, 10);

//     // Insérer l'utilisateur
//     const result = await pool.query(
//       'INSERT INTO users (nom, prenom, email, role, centre_id, mdp_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
//       [nom, prenom, email, role, role === 'gerant' ? centre_id : null, hashedPassword]
//     );

//     res.status(201).json({ message: 'Utilisateur créé avec succès', user: result.rows[0] });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Erreur serveur' });
//   }
// };

// module.exports = { createUser, getCentres };



// controllers/usersController.js
const { pool } = require('../db');
const bcrypt = require('bcrypt');

// Récupérer tous les centres
const getCentres = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM centres ORDER BY nom');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer tous les utilisateurs avec informations centre
const getUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.*,
        c.nom as centre_nom,
        TO_CHAR(u.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
      FROM users u
      LEFT JOIN centres c ON u.centre_id = c.id
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer un utilisateur
const createUser = async (req, res) => {
  try {
    const { nom, prenom, email, role, centre_id, mdp } = req.body;

    // Vérifier si email existe déjà
    const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0)
      return res.status(400).json({ message: 'Email déjà utilisé' });

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(mdp, 10);

    // Insérer l'utilisateur
    const result = await pool.query(
      `INSERT INTO users (nom, prenom, email, role, centre_id, mdp_hash) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, nom, prenom, email, role, centre_id, created_at`,
      [nom, prenom, email, role, (role === 'gerant') ? centre_id : null, hashedPassword]
    );

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour un utilisateur
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, email, role, centre_id } = req.body;

    // Vérifier si l'utilisateur existe
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier si email existe déjà (sauf pour l'utilisateur courant)
    const emailCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND id != $2',
      [email, id]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email déjà utilisé par un autre utilisateur' });
    }

    // Mettre à jour l'utilisateur
    const result = await pool.query(
      `UPDATE users 
       SET nom = $1, prenom = $2, email = $3, role = $4, centre_id = $5 
       WHERE id = $6 
       RETURNING id, nom, prenom, email, role, centre_id, created_at`,
      [nom, prenom, email, role, (role === 'gerant') ? centre_id : null, id]
    );

    res.json({
      message: 'Utilisateur mis à jour avec succès',
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un utilisateur
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si l'utilisateur existe
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Changer le mot de passe d'un utilisateur
const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { mdp } = req.body;

    // Vérifier si l'utilisateur existe
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(mdp, 10);

    await pool.query(
      'UPDATE users SET mdp_hash = $1 WHERE id = $2',
      [hashedPassword, id]
    );

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  getCentres,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword
};