'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Extension pgcrypto
        await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;');

        // 2. centres
        await queryInterface.createTable('centres', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            nom: { type: Sequelize.STRING, allowNull: false },
            adresse: { type: Sequelize.STRING },
            created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 3. formations
        await queryInterface.createTable('formations', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            nom: { type: Sequelize.STRING, allowNull: false },
            duree: { type: Sequelize.NUMERIC, allowNull: false },
            frais_mensuel: { type: Sequelize.NUMERIC, allowNull: false },
            created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 4. etudiants
        await queryInterface.createTable('etudiants', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            nom: { type: Sequelize.STRING, allowNull: false },
            prenom: { type: Sequelize.STRING, allowNull: false },
            telephone: { type: Sequelize.STRING },
            centre_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'centres', key: 'id' }
            },
            statut: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'actif'
            },
            matricule: { type: Sequelize.STRING, allowNull: false },
            email: { type: Sequelize.STRING },
            created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await queryInterface.sequelize.query('ALTER TABLE etudiants ADD CONSTRAINT etudiants_statut_check CHECK (statut IN (\'actif\', \'quitte\', \'fini\'))');

        // 5. inscriptions
        await queryInterface.createTable('inscriptions', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            etudiant_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'etudiants', key: 'id' }
            },
            formation_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'formations', key: 'id' }
            },
            date_inscription: { type: Sequelize.DATEONLY, defaultValue: Sequelize.literal('CURRENT_DATE') },
            droits_inscription_paye: { type: Sequelize.BOOLEAN, defaultValue: false },
            livre_paye: { type: Sequelize.BOOLEAN, defaultValue: false },
            statut: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'actif'
            }
        });
        await queryInterface.sequelize.query('ALTER TABLE inscriptions ADD CONSTRAINT inscriptions_statut_check CHECK (statut IN (\'actif\', \'quitte\', \'fini\'))');

        // 6. paiements
        await queryInterface.createTable('paiements', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            inscription_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'inscriptions', key: 'id' }
            },
            type_paiement: { type: Sequelize.STRING, allowNull: false },
            montant: { type: Sequelize.NUMERIC, allowNull: false },
            mois_paye: { type: Sequelize.STRING },
            date_paiement: { type: Sequelize.DATEONLY, defaultValue: Sequelize.literal('CURRENT_DATE') }
        });
        await queryInterface.sequelize.query('ALTER TABLE paiements ADD CONSTRAINT paiements_type_paiement_check CHECK (type_paiement IN (\'droits\', \'formation\', \'livre\', \'badge\', \'polo\'))');

        // 7. users
        await queryInterface.createTable('users', {
            id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
            nom: { type: Sequelize.STRING, allowNull: false },
            prenom: { type: Sequelize.STRING, allowNull: false },
            email: { type: Sequelize.STRING, allowNull: false },
            role: { type: Sequelize.STRING, allowNull: false },
            centre_id: {
                type: Sequelize.INTEGER,
                references: { model: 'centres', key: 'id' },
                allowNull: true
            },
            mdp_hash: { type: Sequelize.TEXT },
            created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await queryInterface.sequelize.query('ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (\'admin\', \'gerant\', \'dir\'))');

        // 8. articles
        await queryInterface.createTable('articles', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            nom: { type: Sequelize.STRING, allowNull: false },
            type: { type: Sequelize.STRING, allowNull: false },
            prix: { type: Sequelize.NUMERIC, allowNull: false },
            created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await queryInterface.sequelize.query('ALTER TABLE articles ADD CONSTRAINT articles_type_check CHECK (type IN (\'badge\', \'polo\'))');

        // 9. articles_etudiants
        await queryInterface.createTable('articles_etudiants', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            etudiant_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'etudiants', key: 'id' }
            },
            article_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'articles', key: 'id' }
            },
            date_achat: { type: Sequelize.DATEONLY, defaultValue: Sequelize.literal('CURRENT_DATE') },
            statut: { type: Sequelize.STRING, defaultValue: 'non_payé' }
        });
        await queryInterface.sequelize.query('ALTER TABLE articles_etudiants ADD CONSTRAINT articles_etudiants_statut_check CHECK (statut IN (\'non_payé\', \'payé\'))');

        // 10. formateurs
        await queryInterface.createTable('formateurs', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            nom: { type: Sequelize.STRING, allowNull: false },
            prenom: { type: Sequelize.STRING, allowNull: false },
            numero: { type: Sequelize.STRING },
            adresse: { type: Sequelize.STRING },
            diplome: { type: Sequelize.STRING },
            created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 11. formateurs_centres_formations
        await queryInterface.createTable('formateurs_centres_formations', {
            formateur_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'formateurs', key: 'id' }
            },
            centre_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'centres', key: 'id' }
            },
            formation_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'formations', key: 'id' }
            }
        });

        // 12. livres
        await queryInterface.createTable('livres', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            formation_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'formations', key: 'id' }
            },
            nom: { type: Sequelize.STRING, allowNull: false },
            prix: { type: Sequelize.NUMERIC, allowNull: false },
            created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 13. livres_etudiants
        await queryInterface.createTable('livres_etudiants', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            etudiant_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'etudiants', key: 'id' }
            },
            livre_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'livres', key: 'id' }
            },
            date_achat: { type: Sequelize.DATEONLY, defaultValue: Sequelize.literal('CURRENT_DATE') }
        });

        // 14. depenses
        await queryInterface.createTable('depenses', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            centre_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'centres', key: 'id' }
            },
            user_id: {
                type: Sequelize.UUID,
                references: { model: 'users', key: 'id' },
                allowNull: true
            },
            type_depense: { type: Sequelize.STRING, allowNull: false },
            description: { type: Sequelize.TEXT },
            montant: { type: Sequelize.NUMERIC, allowNull: false },
            date_depense: { type: Sequelize.DATEONLY, defaultValue: Sequelize.literal('CURRENT_DATE') },
            created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await queryInterface.sequelize.query('ALTER TABLE depenses ADD CONSTRAINT depenses_type_depense_check CHECK (type_depense IN (\'salaire\', \'loyer\', \'eau\', \'électricité\', \'fournitures\', \'autre\'))');

        // 15. depenses_obligatoires
        await queryInterface.createTable('depenses_obligatoires', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            centre_id: {
                type: Sequelize.INTEGER,
                references: { model: 'centres', key: 'id' }
            },
            montant: { type: Sequelize.NUMERIC, allowNull: false },
            mois: { type: Sequelize.STRING, allowNull: false },
            created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 16. droits_inscription
        await queryInterface.createTable('droits_inscription', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            montant: { type: Sequelize.NUMERIC, allowNull: false, defaultValue: 50000 },
            created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 17. types_montants
        await queryInterface.createTable('types_montants', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            code: { type: Sequelize.STRING, allowNull: false, unique: true },
            libelle: { type: Sequelize.STRING, allowNull: false },
            description: { type: Sequelize.TEXT },
            created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 18. montants_autres
        await queryInterface.createTable('montants_autres', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            type_montant_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'types_montants', key: 'id' }
            },
            centre_id: {
                type: Sequelize.INTEGER,
                references: { model: 'centres', key: 'id' },
                allowNull: true
            },
            etudiant_id: {
                type: Sequelize.INTEGER,
                references: { model: 'etudiants', key: 'id' },
                allowNull: true
            },
            montant: { type: Sequelize.NUMERIC, allowNull: false },
            date_paiement: { type: Sequelize.DATEONLY, defaultValue: Sequelize.literal('CURRENT_DATE') },
            reference: { type: Sequelize.STRING },
            commentaire: { type: Sequelize.TEXT },
            created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
        await queryInterface.sequelize.query('ALTER TABLE montants_autres ADD CONSTRAINT montant_positive CHECK (montant > 0)');
    },

    async down(queryInterface, Sequelize) {
        // Drop in reverse order to respect foreign keys
        await queryInterface.dropTable('montants_autres');
        await queryInterface.dropTable('types_montants');
        await queryInterface.dropTable('droits_inscription');
        await queryInterface.dropTable('depenses_obligatoires');
        await queryInterface.dropTable('depenses');
        await queryInterface.dropTable('livres_etudiants');
        await queryInterface.dropTable('livres');
        await queryInterface.dropTable('formateurs_centres_formations');
        await queryInterface.dropTable('formateurs');
        await queryInterface.dropTable('articles_etudiants');
        await queryInterface.dropTable('articles');
        await queryInterface.dropTable('users');
        await queryInterface.dropTable('paiements');
        await queryInterface.dropTable('inscriptions');
        await queryInterface.dropTable('etudiants');
        await queryInterface.dropTable('formations');
        await queryInterface.dropTable('centres');
        await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS pgcrypto;');
    }
};
