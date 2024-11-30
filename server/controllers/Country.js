const Country = require('../models/Country');
const NationalTeam = require('../models/NationalTeams');

module.exports = {

    // get all countries
    async fetchAll(req, res) {
        try {
            const countries = await Country.find();
            return res.status(200).send(countries);
        } catch (error) {
            return res.status(400).send(error);
        }
    },
    async fetchAllNationalTeams(req, res) {
        try {
            const { country } = req.query;
            const nationalTeams = await NationalTeam.find({ country });
            return res.status(200).send(nationalTeams);
        } catch (error) {
            return res.status(400).send(error);
        }
    }

}