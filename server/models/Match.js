const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
    homeTeam: {
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ClubTeam',
            required: true
        },
        score: {
            type: Number,
            required: true,
            min: 0
        },
        players: [{
            player: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Player',
                required: true
            },
            starter: {
                type: Boolean,
                default: false
            }
        }]
    },
    awayTeam: {
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ClubTeam',
            required: true
        },
        score: {
            type: Number,
            required: true,
            min: 0
        },
        players: [{
            player: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Player',
                required: true
            },
            starter: {
                type: Boolean,
                default: false
            }
        }]
    },
    date: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value <= new Date();
            },
            message: 'Match date must be in the past'
        }
    },
    venue: {
        type: String,
        required: true
    },
    odds: {
        homeWin: {
            type: Number,
            required: true,
            min: 0,
            max:1,
            validate: {
                validator: function(value) {
                    // Sum of probabilities should be approximately 1
                    const sum = this.odds.homeWin + this.odds.draw + this.odds.awayWin;
                    return Math.abs(sum - 1) < 0.01; // Allow small floating point differences
                },
                message: 'Probabilities must sum to 1'
            }
        },
        draw: {
            type: Number,
            required: true,
            min: 0,
            max:1,
        },
        awayWin: {
            type: Number,
            required: true,
            min: 0,
            max:1,
        }
    }
}, {
    timestamps: true
});

// Ensure home and away teams are different
MatchSchema.pre('save', function(next) {
    if (this.homeTeam.club.equals(this.awayTeam.club)) {
        next(new Error('Home team and away team cannot be the same'));
    }
    next();
});

MatchSchema.pre('save', function(next) {
    const totalProb = this.odds.homeWin + this.odds.draw + this.odds.awayWin;
    if (Math.abs(totalProb - 1) >= 0.01) {
        next(new Error('Match odds probabilities must sum to 1'));
    }
    next();
});

// Ensure exactly 11 starters per team
MatchSchema.pre('save', function(next) {
    const homeStarters = this.homeTeam.players.filter(p => p.starter).length;
    const awayStarters = this.awayTeam.players.filter(p => p.starter).length;
    
    if (homeStarters < 11 || awayStarters < 11) {
        next(new Error('Each team must have at least 11 starters'));
    }
    next();
});

module.exports = mongoose.model('Match', MatchSchema);