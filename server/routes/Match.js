const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Player = require('../models/Player');

// Helper functions for rating calculations
const calculateExpectedPoints = (odds) => {
    const winProb = odds.homeWin;
    const drawProb = odds.draw;
    const loseProb = odds.awayWin;
    
    return (winProb * 3) + (drawProb * 1) + (loseProb * 0);
};

const getMatchPoints = (goalsFor, goalsAgainst) => {
    if (goalsFor > goalsAgainst) return 3;
    if (goalsFor === goalsAgainst) return 1;
    return 0;
};

// Get all matches with pagination and search
router.get('/matches', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';

        const query = {};
        if (searchTerm) {
            query['$or'] = [
                { 'venue': { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const total = await Match.countDocuments(query);
        
        // Handle no matches case
        if (total === 0) {
            return res.json({
                matches: [],
                currentPage: 1,
                totalPages: 0,
                total: 0,
                message: searchTerm 
                    ? `No matches found matching "${searchTerm}"`
                    : 'No matches found'
            });
        }

        // Calculate valid page number
        const totalPages = Math.ceil(total / limit);
        const validPage = Math.min(Math.max(1, page), totalPages);

        const matches = await Match.find(query)
            .populate('homeTeam.club', 'name')
            .populate('awayTeam.club', 'name')
            .populate('homeTeam.players.player', 'name')
            .populate('awayTeam.players.player', 'name')
            .sort({ date: -1 })
            .skip((validPage - 1) * limit)
            .limit(limit);

        res.json({
            matches,
            currentPage: validPage,
            totalPages,
            total
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error retrieving matches',
            error: error.message 
        });
    }
});

// Get a single match by ID
router.get('/matches/:id', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('homeTeam.club', 'name')
            .populate('awayTeam.club', 'name')
            .populate('homeTeam.players.player', 'name position')
            .populate('awayTeam.players.player', 'name position');

        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        res.json(match);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new match
const calculateRatingChange = (actualPoints, expectedPoints) => {
    return Number((actualPoints - expectedPoints).toFixed(2));
};

// POST route with simplified rating storage
router.post('/matches', async (req, res) => {
    try {
        const matchDate = new Date(req.body.date);
        if (matchDate > new Date()) {
            return res.status(400).json({ message: 'Match date must be in the past' });
        }

        // Calculate expected points
        const homeExpectedPoints = calculateExpectedPoints(req.body.odds);
        const awayExpectedPoints = calculateExpectedPoints({
            homeWin: req.body.odds.awayWin,
            draw: req.body.odds.draw,
            awayWin: req.body.odds.homeWin
        });

        // Calculate actual points
        const homeActualPoints = getMatchPoints(
            req.body.homeTeam.score,
            req.body.awayTeam.score
        );
        const awayActualPoints = getMatchPoints(
            req.body.awayTeam.score,
            req.body.homeTeam.score
        );

        // Calculate rating changes
        const homeRatingChange = calculateRatingChange(
            homeActualPoints,
            homeExpectedPoints
        );
        const awayRatingChange = calculateRatingChange(
            awayActualPoints,
            awayExpectedPoints
        );

        // Add rating changes to match data
        const matchData = {
            ...req.body,
            homeTeam: {
                ...req.body.homeTeam,
                ratingChange: homeRatingChange
            },
            awayTeam: {
                ...req.body.awayTeam,
                ratingChange: awayRatingChange
            }
        };

        // Create and save the match
        const match = new Match(matchData);
        const savedMatch = await match.save();

        // Updated player rating update function
        const updatePlayerRatings = async (players, ratingChange) => {
            return Promise.all(players.map(async ({ player: playerId }) => {
                const ratingHistoryEntry = {
                    date: matchDate,
                    newRating: ratingChange,
                    type: 'match',
                    matchId: savedMatch._id  // Add the match ID reference
                };

                return Player.findByIdAndUpdate(
                    playerId,
                    {
                        $push: { ratingHistory: ratingHistoryEntry }
                    },
                    { 
                        new: true,
                        runValidators: true 
                    }
                );
            }));
        };

        // Update ratings for both teams' starting players
        await Promise.all([
            updatePlayerRatings(req.body.homeTeam.players.filter(p => p.starter), homeRatingChange),
            updatePlayerRatings(req.body.awayTeam.players.filter(p => p.starter), awayRatingChange)
        ]);

        // Return populated match data
        const populatedMatch = await Match.findById(savedMatch._id)
            .populate('homeTeam.club', 'name')
            .populate('awayTeam.club', 'name')
            .populate('homeTeam.players.player', 'name')
            .populate('awayTeam.players.player', 'name');

        res.status(201).json({
            match: populatedMatch,
            ratingChanges: {
                home: homeRatingChange,
                away: awayRatingChange
            }
        });
    } catch (error) {
        console.error('Error details:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;