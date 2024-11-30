const { fetchAll, fetchAllNationalTeams } = require('../controllers/Country');

const router = require('express').Router();

router.get('/', fetchAll);
router.get('/national-teams', fetchAllNationalTeams);

module.exports = router;