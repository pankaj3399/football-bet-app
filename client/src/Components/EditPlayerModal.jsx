import { useEffect, useState } from "react";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { getNationalTeams } from "../api/Country"; // Add this import
import { useQuery } from '@tanstack/react-query';
import { getActiveClubs } from '../api/Clubs';
import { getPositions } from '../api/Position';
import { getCountries } from '../api/Country';
import Loader from './Loader/Loader';
import Select from "react-select";

const EditPlayerModal = ({
  player,
  onClose,
  onUpdate,
}) => {

  const { isLoading: clubsDataLoading, error: clubsDataError, data: clubsData } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => getActiveClubs(),
});

const { isLoading: positionsDataLoading, error: positionsDataError, data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn: () => getPositions()
});

const { isLoading: countriesDataLoading, error: countriesDataError, data: countriesData } = useQuery({
    queryKey: ['countries'],
    queryFn: () => getCountries(),
});
  // Update the initial state to match your DB structure
  const [editedPlayer, setEditedPlayer] = useState({
    ...player,
    rating: player.rating || 1, // Add default rating of 1
    currentClub: {
      club: player.currentClub?.club || null,
      from: player.currentClub?.from?.split("T")[0] || "",
    },
    nationalTeams: player.nationalTeams?.map(team => ({
      name: team.name || '',
      from: team.from?.split('T')[0] || '',
      type: team.type || '',
      to: team.to?.split('T')[0] || '',
      teams: [],
      disabled: true,
      currentlyPlaying: !team.to
    })) || [{
      name: '',
      from: '',
      type: '',
      to: '',
      teams: [],
      disabled: true,
      currentlyPlaying: false
    }],
    previousClubs: (player.previousClubs || []).map(club => ({
      name: club.name,
      from: club.from?.split('T')[0] || '',
      to: club.to?.split('T')[0] || ''
    }))
  });

  const fetchNationalTeams = async (country, index) => {
    const teams = await getNationalTeams(country);
    const teamsArray = teams.map((team) => team.type);
    const updatedTeams = [...editedPlayer.nationalTeams];
    updatedTeams[index].teams = teamsArray;
    updatedTeams[index].disabled = false;
    setEditedPlayer({ ...editedPlayer, nationalTeams: updatedTeams });
  };

  const handleInputChange = (field, value) => {
    setEditedPlayer({ ...editedPlayer, [field]: value });
  };

  const handleClubChange = (field, subfield, value) => {
    setEditedPlayer({
      ...editedPlayer,
      [field]: { ...editedPlayer[field], [subfield]: value },
    });
  };

  const handleNationalTeamChange = (index, field, value) => {
    const updatedTeams = [...editedPlayer.nationalTeams];
    updatedTeams[index][field] = value;
    setEditedPlayer({ ...editedPlayer, nationalTeams: updatedTeams });
  };

  const handleAddNationalTeam = () => {
    setEditedPlayer({
      ...editedPlayer,
      nationalTeams: [
        ...editedPlayer.nationalTeams,
        {
          name: "",
          from: "",
          to: "",
          type: "",
          teams: [],
          disabled: true,
          currentlyPlaying: false,
        },
      ],
    });
  };

  const handleAddPreviousClub = () => {
    setEditedPlayer({
      ...editedPlayer,
      previousClubs: [
        ...editedPlayer.previousClubs,
        { name: "", from: "", to: "" },
      ],
    });
  };
  useEffect(() => {
    console.log('Player data:', player);
    console.log('Current club data:', player.currentClub);
  }, [player]);
  console.log('ClubsData available:', clubsData);
console.log('Current club ID we are looking for:', editedPlayer.currentClub.club);
  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Edit Player
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUpdate(editedPlayer);
          }}
          className="space-y-6"
        >
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="font-semibold text-gray-700">Name:</label>
              <Input
                value={editedPlayer.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="font-semibold text-gray-700">
                Date of Birth:
              </label>
              <Input
                type="date"
                value={editedPlayer.dateOfBirth?.split("T")[0]}
                onChange={(e) =>
                  handleInputChange("dateOfBirth", e.target.value)
                }
              />
            </div>

            <div className="flex flex-col">
              <label className="font-semibold text-gray-700">Position:</label>
              <Select
                value={
                  editedPlayer.position
                    ? {
                        value: editedPlayer.position,
                        label: positionsData?.find((p) => p.position)?.position,
                      }
                    : null
                }
                onChange={(option) =>
                  handleInputChange("position", option.value)
                }
                options={
                  positionsData?.map((p) => ({
                    value: p.position,
                    label: p.position,
                  })) || []
                }
              />
            </div>
          </div>
         
          {/* Current Club */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700">Current Club</h3>
            <Select
  value={
    editedPlayer.currentClub.club && clubsData
      ? {
          value: editedPlayer.currentClub.club,
          label: clubsData.find(
            (c) => c._id === editedPlayer.currentClub.club
          )?.name || 'Club not found'
        }
      : null
  }
  onChange={(option) =>
    handleClubChange("currentClub", "club", option.value)
  }
  options={clubsData?.map((club) => ({
    value: club._id,
    label: club.name,
  })) || []}
  isLoading={clubsDataLoading}
  placeholder="Select a club"
  className="w-full"
  noOptionsMessage={() => "No clubs found"}
/>
            <Input
              type="date"
              value={editedPlayer.currentClub.from?.split("T")[0]}
              onChange={(e) =>
                handleClubChange("currentClub", "from", e.target.value)
              }
            />
          </div>

          {/* National Teams */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">National Teams</h3>
              <Button type="button" onClick={handleAddNationalTeam}>
                Add Team
              </Button>
            </div>
            {editedPlayer.nationalTeams.map((team, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <Select
                  value={{ label: team.name, value: team.name }}
                  onChange={(option) => {
                    handleNationalTeamChange(index, "name", option.value);
                    fetchNationalTeams(option.value, index);
                  }}
                  options={
                    countriesData?.map((country) => ({
                      value: country.country,
                      label: country.country,
                    })) || []
                  }
                />
             <Select
  value={{ label: team.type, value: team.type }}
  onChange={(e) =>
    handleNationalTeamChange(index, "type", e.value)
  }
  options={team.teams?.map((type) => ({
    value: type,
    label: type
  })) || []}
  isDisabled={team.disabled}
/>
                <div className="flex gap-4">
                  <Input
                    type="date"
                    value={team.from}
                    onChange={(e) =>
                      handleNationalTeamChange(index, "from", e.target.value)
                    }
                  />
                  {!team.currentlyPlaying && (
                    <Input
                      type="date"
                      value={team.to}
                      onChange={(e) =>
                        handleNationalTeamChange(index, "to", e.target.value)
                      }
                    />
                  )}
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={team.currentlyPlaying}
                    onChange={() =>
                      handleNationalTeamChange(
                        index,
                        "currentlyPlaying",
                        !team.currentlyPlaying
                      )
                    }
                  />
                  Currently Playing
                </label>
              </div>
            ))}
          </div>

          {/* Previous Clubs */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Previous Clubs</h3>
              <Button type="button" onClick={handleAddPreviousClub}>
                Add Club
              </Button>
            </div>
            {editedPlayer.previousClubs.map((club, index) => (
              <div key={index} className="flex gap-4">
                <Select
                  value={
                    club.name
                      ? {
                          value: club.name,
                          label: clubsData?.find((c) => c._id === club.name)
                            ?.name,
                        }
                      : null
                  }
                  onChange={(option) => {
                    const updatedClubs = [...editedPlayer.previousClubs];
                    updatedClubs[index].name = option.value;
                    setEditedPlayer({
                      ...editedPlayer,
                      previousClubs: updatedClubs,
                    });
                  }}
                  options={clubsData.map((c) => ({
                    value: c._id,
                    label: c.name,
                  }))}
                />
                <Input
                  type="date"
                  value={club.from}
                  onChange={(e) => {
                    const updatedClubs = [...editedPlayer.previousClubs];
                    updatedClubs[index].from = e.target.value;
                    setEditedPlayer({
                      ...editedPlayer,
                      previousClubs: updatedClubs,
                    });
                  }}
                />
                <Input
                  type="date"
                  value={club.to}
                  onChange={(e) => {
                    const updatedClubs = [...editedPlayer.previousClubs];
                    updatedClubs[index].to = e.target.value;
                    setEditedPlayer({
                      ...editedPlayer,
                      previousClubs: updatedClubs,
                    });
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="yellow">
              Update Player
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPlayerModal;
