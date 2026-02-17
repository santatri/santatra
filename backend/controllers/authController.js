const { pool } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const loginUser = async (req, res) => {
  const { email, mdp } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, nom, prenom, email, role, centre_id, mdp_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) 
      return res.status(401).json({ message: 'Utilisateur non trouvé' });

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(mdp, user.mdp_hash);

    if (!isPasswordValid) return res.status(401).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '1d' }
    );

    res.json({
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        centre_id: user.centre_id,
      },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { loginUser };
