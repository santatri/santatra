'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('montants_autres', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      type_montant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'types_montants',
          key: 'id'
        }
      },
      centre_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'centres',
          key: 'id'
        },
        allowNull: true
      },
      etudiant_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'etudiants',
          key: 'id'
        },
        allowNull: true
      },
      montant: {
        type: Sequelize.NUMERIC,
        allowNull: false
      },
      date_paiement: {
        type: Sequelize.DATEONLY,
        defaultValue: Sequelize.literal('CURRENT_DATE')
      },
      reference: {
        type: Sequelize.STRING
      },
      commentaire: {
        type: Sequelize.TEXT
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    // Ajout d'une contrainte CHECK sur montant > 0
    await queryInterface.sequelize.query('ALTER TABLE montants_autres ADD CONSTRAINT montant_positive CHECK (montant > 0)');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('montants_autres');
  }
};
