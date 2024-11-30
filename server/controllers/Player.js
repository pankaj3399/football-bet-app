// controllers/Player.js
const Player = require('../models/Player');

module.exports = {
    async create(req, res) {
        const { name, dateOfBirth, position, currentClub, country, nationalTeams, previousClubs, rating } = req.body;

        if (!name || !dateOfBirth || !position || !country) {
            return res.status(400).json({ 
                success: false,
                msg: 'Name, date of birth, position, and country are required' 
            });
        }

        try {
            // Validate date format
            const validDate = new Date(dateOfBirth);
            if (isNaN(validDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    msg: 'Invalid date format for date of birth'
                });
            }

            // Check for duplicate
            const existingPlayer = await Player.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                dateOfBirth: new Date(dateOfBirth)
            });

            if (existingPlayer) {
                return res.status(400).json({
                    success: false,
                    msg: 'A player with the same name and date of birth already exists'
                });
            }

            // Create new player
            const player = await Player.create({
                name,
                dateOfBirth: new Date(dateOfBirth),
                position,
                currentClub,
                country,
                nationalTeams: nationalTeams?.map(team => ({
                    ...team,
                    from: new Date(team.from),
                    to: new Date(team.to)

                })),
                previousClubs: previousClubs?.map(club => ({
                    ...club,
                    from: new Date(club.from),
                    to: new Date(club.to)
                })),
                rating,
                ratings: [] // Initialize empty ratings array
            });

            return res.status(201).json({
                success: true,
                data: player
            });
        } catch (error) {
            console.error('Error creating player:', error);
            return res.status(500).json({ 
                success: false,
                msg: 'Error creating player',
                error: error.message 
            });
        }
    },

    async checkDuplicate(req, res) {
        const { name, dateOfBirth } = req.query;

        if (!name || !dateOfBirth) {
            return res.status(400).json({
                success: false,
                msg: 'Name and date of birth are required'
            });
        }

        try {
            const validDate = new Date(dateOfBirth);
            if (isNaN(validDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    msg: 'Invalid date format'
                });
            }

            const existingPlayer = await Player.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                dateOfBirth: new Date(dateOfBirth)
            });

            return res.json({
                success: true,
                exists: !!existingPlayer
            });
        } catch (error) {
            console.error('Error checking for duplicate:', error);
            return res.status(500).json({
                success: false,
                msg: 'Error checking for duplicate player',
                error: error.message
            });
        }
    },

    async updatePlayer(req, res) {
        try {
            const playerId = req.params.id;
            const { rating, matchDate, ...otherData } = req.body;

            let updateData = {
                ...otherData,
                dateOfBirth: new Date(otherData.dateOfBirth),
                nationalTeams: otherData.nationalTeams?.map(team => ({
                    ...team,
                    from: new Date(team.from),
                    to: new Date(team.to)  // Added this line to handle 'to' date
                }))
            };

            // If rating update is included, add to ratings array
            if (rating !== undefined && matchDate) {
                updateData.$push = {
                    ratings: {
                        date: new Date(matchDate),
                        rating: Number(rating)
                    }
                };
            }

            const player = await Player.findByIdAndUpdate(
                playerId,
                updateData,
                { new: true, runValidators: true }
            )
            .populate('position')
            .populate('country')
            .populate('currentClub.club');

            if (!player) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Player not found' 
                });
            }

            res.json({
                success: true,
                data: player
            });
        } catch (error) {
            console.error('Error updating player:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error updating player', 
                error: error.message 
            });
        }
    },

};