import React, { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from 'react-router-dom';
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Card, CardContent } from "../Components/ui/card";
import Select from "react-select";
import { useToast } from "@/hooks/use-toast";
import { getActiveClubs } from "../api/Clubs";

const calculateExpectedPoints = (odds) => {
    const winProb = parseFloat(odds.homeWin) || 0;
    const drawProb = parseFloat(odds.draw) || 0;
    const loseProb = parseFloat(odds.awayWin) || 0;
    return (winProb * 3) + (drawProb * 1) + (loseProb * 0);
  };
  
  const getMatchPoints = (goalsFor, goalsAgainst) => {
    if (goalsFor > goalsAgainst) return 3;
    if (goalsFor === goalsAgainst) return 1;
    return 0;
  };
  
  const calculateRatingChange = (actualPoints, expectedPoints) => {
    return Number((actualPoints - expectedPoints).toFixed(2));
  };


 

const AddMatch = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [matchData, setMatchData] = useState({
    date: "",
    venue: "",
    homeTeam: {
      club: "",
      score: "",
      players: [],
    },
    awayTeam: {
      club: "",
      score: "",
      players: [],
    },
    odds: {
      homeWin: "",
      draw: "",
      awayWin: "",
    },
  });

  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);

  const { data: clubsData } = useQuery({
    queryKey: ["clubs"],
    queryFn: () => getActiveClubs(),
  });

  // Keep all the handlers and effects from AddMatchModal
  const handlePlayerSelection = useCallback((playerId, isStarter, isHome) => {
    const teamKey = isHome ? "homeTeam" : "awayTeam";
    setMatchData((prev) => {
      const currentPlayers = [...prev[teamKey].players];
      const playerIndex = currentPlayers.findIndex(
        (p) => p.player === playerId
      );

      let updatedPlayers;
      if (playerIndex === -1 && isStarter) {
        updatedPlayers = [
          ...currentPlayers,
          { player: playerId, starter: true },
        ];
      } else if (!isStarter) {
        updatedPlayers = currentPlayers.filter((p) => p.player !== playerId);
      } else {
        updatedPlayers = currentPlayers.map((p) =>
          p.player === playerId ? { ...p, starter: true } : p
        );
      }

      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          players: updatedPlayers,
        },
      };
    });
  }, []);

  // Keep the fetchPlayers effect
// Replace the existing useEffect that handles fetching players with this:
useEffect(() => {
  const fetchPlayers = async (teamId, isHome) => {
    if (!teamId) return;

    try {
      let url = `${import.meta.env.VITE_REACT_APP_API_URL}/api/club/${teamId}/players`;
      
      console.log("[fetchPlayers] Current date value:", matchData.date);
      
      if (matchData.date) {
        url += `?date=${encodeURIComponent(matchData.date)}`;
        console.log("[fetchPlayers] Full URL:", url);
      } else {
        console.log("[fetchPlayers] No date parameter included");
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch players");
      }

      const players = await response.json();
      console.log(`[fetchPlayers] Found ${players.length} players for team:`, isHome ? 'home' : 'away');

      if (isHome) {
        setHomePlayers(players);
      } else {
        setAwayPlayers(players);
      }
    } catch (error) {
      console.error(`[fetchPlayers] Error:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to fetch ${isHome ? "home" : "away"} team players`,
      });
    }
  };

  if (matchData.homeTeam.club) {
    console.log("[fetchPlayers] Fetching home team players");
    fetchPlayers(matchData.homeTeam.club, true);
  }
  if (matchData.awayTeam.club) {
    console.log("[fetchPlayers] Fetching away team players");
    fetchPlayers(matchData.awayTeam.club, false);
  }
}, [matchData.homeTeam.club, matchData.awayTeam.club, matchData.date, toast]);


// Add this near the top of your component with other useEffects
useEffect(() => {
  console.log("[matchData] State updated:", matchData);
}, [matchData]);
  const addMatchMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(
        `${import.meta.env.VITE_REACT_APP_API_URL}/api/match/matches`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create match");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["matches"]);
      queryClient.invalidateQueries(["players"]);
      toast({
        title: "Match Added Successfully",
        description: `Match result saved and player ratings updated`,
      });
      navigate('/matches');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add match",
      });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Validate match date
      const matchDate = new Date(matchData.date);
      if (matchDate > new Date()) {
        toast({
          variant: "destructive",
          description: "Match date must be in the past",
        });
        return;
      }

      // Validate player counts
      const homeStarters = matchData.homeTeam.players.filter(
        (p) => p.starter
      ).length;
      const awayStarters = matchData.awayTeam.players.filter(
        (p) => p.starter
      ).length;

      if (homeStarters < 11 || awayStarters < 11) {
        toast({
          variant: "destructive",
          title: "Insufficient Players",
          description: `Each team must have at least 11 starters. Current: Home (${homeStarters}), Away (${awayStarters})`,
        });
        return;
      }

      await addMatchMutation.mutateAsync(matchData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit match data",
      });
    }
  };
  useEffect(() => {
    const { homeTeam, awayTeam, odds } = matchData;
    
    // Check if we have all required values
    if (
      homeTeam.score !== "" &&
      awayTeam.score !== "" &&
      odds.homeWin !== "" &&
      odds.draw !== "" &&
      odds.awayWin !== ""
    ) {
      // Calculate expected points
      const homeExpectedPoints = calculateExpectedPoints(odds);
      const awayExpectedPoints = calculateExpectedPoints({
        homeWin: odds.awayWin,
        draw: odds.draw,
        awayWin: odds.homeWin
      });

      // Calculate actual points
      const homeActualPoints = getMatchPoints(
        parseInt(homeTeam.score),
        parseInt(awayTeam.score)
      );
      const awayActualPoints = getMatchPoints(
        parseInt(awayTeam.score),
        parseInt(homeTeam.score)
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

      // Show toast with rating changes
      toast({
        title: "Predicted Rating Changes",
        description: (
          <div className="space-y-1">
            <p>Home Team: {homeRatingChange > 0 ? "+" : ""}{homeRatingChange}</p>
            <p>Away Team: {awayRatingChange > 0 ? "+" : ""}{awayRatingChange}</p>
          </div>
        ),
        duration: 5000,
      });
    }
  }, [
    matchData.homeTeam.score,
    matchData.awayTeam.score,
    matchData.odds.homeWin,
    matchData.odds.draw,
    matchData.odds.awayWin,
    toast
  ]);
  return (
    <div className="p-8 w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Add New Match</h1>
        <Button variant="outline" onClick={() => navigate('/matches')}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Match Details */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
  <label className="block mb-1">Date</label>
  <Input
    type="datetime-local"
    value={matchData.date ? new Date(matchData.date).toISOString().slice(0, 16) : ''}
    onChange={(e) => {
      const selectedDate = new Date(e.target.value).toISOString();
      console.log("[Date Input] Raw value:", e.target.value);
      console.log("[Date Input] Converted to ISO:", selectedDate);
      setMatchData(prev => {
        console.log("[Date Input] Previous matchData:", prev);
        const newData = {
          ...prev,
          date: selectedDate
        };
        console.log("[Date Input] New matchData:", newData);
        return newData;
      });
    }}
    required
  />
</div>
              <div>
                <label className="block mb-1">Venue</label>
                <Input
                  type="text"
                  value={matchData.venue}
                  onChange={(e) => setMatchData({
                    ...matchData,
                    venue: e.target.value,
                  })}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teams Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Home Team */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Home Team</h3>
              <div className="space-y-4">
                <Select
                  value={matchData.homeTeam.club ? {
                    value: matchData.homeTeam.club,
                    label: clubsData?.find(club => club._id === matchData.homeTeam.club)?.name
                  } : null}
                  onChange={(selected) => setMatchData({
                    ...matchData,
                    homeTeam: {
                      ...matchData.homeTeam,
                      club: selected.value,
                    },
                  })}
                  options={clubsData?.map((club) => ({
                    label: club.name,
                    value: club._id,
                  })) || []}
                  placeholder="Select Home Team"
                />

                <div>
                  <label className="block mb-1">Score</label>
                  <Input
                    type="number"
                    value={matchData.homeTeam.score}
                    onChange={(e) => setMatchData({
                      ...matchData,
                      homeTeam: {
                        ...matchData.homeTeam,
                        score: parseInt(e.target.value) || 0,
                      },
                    })}
                    required
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-2">Select Players (11 starters required)</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {homePlayers.map((player) => (
                      <div
                        key={player._id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={matchData.homeTeam.players.some(
                            (p) => p.player === player._id && p.starter
                          )}
                          onChange={(e) => handlePlayerSelection(
                            player._id,
                            e.target.checked,
                            true
                          )}
                          className="w-4 h-4"
                        />
                        <span>{player.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Away Team */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Away Team</h3>
              <div className="space-y-4">
                <Select
                  value={matchData.awayTeam.club ? {
                    value: matchData.awayTeam.club,
                    label: clubsData?.find(club => club._id === matchData.awayTeam.club)?.name
                  } : null}
                  onChange={(selected) => setMatchData({
                    ...matchData,
                    awayTeam: {
                      ...matchData.awayTeam,
                      club: selected.value,
                    },
                  })}
                  options={clubsData?.map((club) => ({
                    label: club.name,
                    value: club._id,
                  })) || []}
                  placeholder="Select Away Team"
                />

                <div>
                  <label className="block mb-1">Score</label>
                  <Input
                    type="number"
                    value={matchData.awayTeam.score}
                    onChange={(e) => setMatchData({
                      ...matchData,
                      awayTeam: {
                        ...matchData.awayTeam,
                        score: parseInt(e.target.value) || 0,
                      },
                    })}
                    required
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-2">Select Players (11 starters required)</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {awayPlayers.map((player) => (
                      <div
                        key={player._id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={matchData.awayTeam.players.some(
                            (p) => p.player === player._id && p.starter
                          )}
                          onChange={(e) => handlePlayerSelection(
                            player._id,
                            e.target.checked,
                            false
                          )}
                          className="w-4 h-4"
                        />
                        <span>{player.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Odds Section */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Match Odds</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1">Home Win</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={matchData.odds.homeWin}
                  onChange={(e) => setMatchData({
                    ...matchData,
                    odds: {
                      ...matchData.odds,
                      homeWin: parseFloat(e.target.value) || 0,
                    },
                  })}
                  required
                />
              </div>
              <div>
                <label className="block mb-1">Draw</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={matchData.odds.draw}
                  onChange={(e) => setMatchData({
                    ...matchData,
                    odds: {
                      ...matchData.odds,
                      draw: parseFloat(e.target.value) || 0,
                    },
                  })}
                  required
                />
              </div>
              <div>
                <label className="block mb-1">Away Win</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={matchData.odds.awayWin}
                  onChange={(e) => setMatchData({
                    ...matchData,
                    odds: {
                      ...matchData.odds,
                      awayWin: parseFloat(e.target.value) || 0,
                    },
                  })}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/matches')}
          >
            Cancel
          </Button>
          <Button type="submit">
            Add Match
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddMatch;