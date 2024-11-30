import React from 'react';

const MatchesTable = ({ matches }) => {
    if (!matches || matches.length === 0) {
        return (
            <div className="w-full p-4 text-center text-gray-500">
                No matches found
            </div>
        );
    }

    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (error) {
            return 'Invalid date';
        }
    };

    const formatOdds = (odds) => {
        if (!odds) return 'N/A';
        try {
            const { homeWin, draw, awayWin } = odds;
            return `${Number(homeWin).toFixed(2)} / ${Number(draw).toFixed(2)} / ${Number(awayWin).toFixed(2)}`;
        } catch (error) {
            return 'N/A';
        }
    };

    return (
        <table className="w-full border-collapse">
            <thead>
                <tr>
                    <th className="bg-gray-200 p-2 text-left">Date</th>
                    <th className="bg-gray-200 p-2 text-left">Home Team</th>
                    <th className="bg-gray-200 p-2 text-center">Score</th>
                    <th className="bg-gray-200 p-2 text-left">Away Team</th>
                    <th className="bg-gray-200 p-2 text-left">Venue</th>
                    <th className="bg-gray-200 p-2 text-left">Lineup</th>
                    <th className="bg-gray-200 p-2 text-left">Odds</th>
                </tr>
            </thead>
            <tbody>
                {matches.map((match) => (
                    <tr key={match?._id || Math.random()} className="hover:bg-gray-100 transition-colors">
                        <td className="border-b p-2">
                            <div className="text-gray-600">
                                {formatDate(match?.date)}
                            </div>
                        </td>
                        <td className="border-b p-2">
                            <div className="font-medium">
                                {match?.homeTeam?.club?.name || 'Unknown Team'}
                            </div>
                        </td>
                        <td className="border-b p-2 text-center font-semibold">
                            <div className="flex items-center justify-center">
                                <span>{match?.homeTeam?.score ?? '-'}</span>
                                <span className="mx-2">-</span>
                                <span>{match?.awayTeam?.score ?? '-'}</span>
                            </div>
                        </td>
                        <td className="border-b p-2">
                            <div className="font-medium">
                                {match?.awayTeam?.club?.name || 'Unknown Team'}
                            </div>
                        </td>
                        <td className="border-b p-2">
                            <div className="text-gray-600">
                                {match?.venue || 'N/A'}
                            </div>
                        </td>
                        <td className="border-b p-2">
                            <button
                                className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                                onClick={() => {
                                    if (match?.homeTeam?.players || match?.awayTeam?.players) {
                                        console.log('Show players', match);
                                    }
                                }}
                                disabled={!match?.homeTeam?.players && !match?.awayTeam?.players}
                            >
                                View Lineup
                            </button>
                        </td>
                        <td className="border-b p-2">
                            <div className="text-gray-600">
                                {formatOdds(match?.odds)}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default MatchesTable;