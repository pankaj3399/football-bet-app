import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClubs, addClub, editClub, deleteClub } from "../api/Clubs";
import { getPositions } from "../api/Position";
import { getCountries } from "../api/Country";
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "../Components/ui/table";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Edit, Trash2, Users } from "lucide-react";
import Loader from "./Loader/Loader";
import EditPlayerModal from "./EditPlayerModal";
import PlayersTable from "./PlayersTable";
import ClubsTable from "./ClubsTable";
import { useNavigate } from 'react-router-dom'
const Home = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [clubName, setClubName] = useState("");
  const queryClient = useQueryClient();
  const [showEditPlayerModal, setShowEditPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  // Clubs query
  const { isLoading, error, data } = useQuery({
    queryKey: ["clubs", page, searchDebounce],
    queryFn: () => getClubs({ page, search }),
  });
  const { data: positionsData } = useQuery({
    queryKey: ["positions"],
    queryFn: () => getPositions(),
  });

  const { data: countriesData } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getCountries(),
  });
  const {
    data: playersData,
    isLoading: isLoadingPlayers,
    error: playersError,
  } = useQuery({
    queryKey: ["clubPlayers", selectedClubId],
    queryFn: async () => {
      try {
        console.log("Fetching players for club:", selectedClubId);
        
        // Use absolute URL with the API base URL
        const url = `${import.meta.env.VITE_REACT_APP_API_URL}/api/club/${selectedClubId}/players`;
        console.log("Fetching from URL:", url);
  
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response:", errorText);
          throw new Error(`Failed to fetch players: ${response.status}`);
        }
  
        const data = await response.json();
        console.log("Successfully parsed JSON data:", data);
        return data;
      } catch (error) {
        console.error("Detailed fetch error:", error);
        throw error;
      }
    },
    enabled: !!selectedClubId && showPlayersModal,
    retry: 1,
  });
  useEffect(() => {
    const timeOutId = setTimeout(() => {
      setSearchDebounce(search);
    }, 1000);
    return () => clearTimeout(timeOutId);
  }, [search]);

  const addClubMutation = useMutation({
    mutationFn: addClub,
    onSuccess: () => {
      queryClient.invalidateQueries("clubs");
      setShowAddModal(false);
      setClubName("");
    },
  });

  const editClubMutation = useMutation({
    mutationFn: editClub,
    onSuccess: () => {
      queryClient.invalidateQueries(["clubPlayers", selectedClubId]);
      setShowEditPlayerModal(false);
      setSelectedPlayer(null);
    },
  });

  const deleteClubMutation = useMutation({
    mutationFn: deleteClub,
    onSuccess: () => {
      queryClient.invalidateQueries("clubs");
      setShowDeleteModal(false);
      setSelectedClubId(null);
    },
  });

  const handleAddClub = () => {
    addClubMutation.mutate({ name: clubName });
  };

  const handleEditClub = () => {
    editClubMutation.mutate({ id: selectedClubId, name: clubName });
  };

  const handleDeleteClub = () => {
    deleteClubMutation.mutate(selectedClubId);
  };

  const handleViewPlayers = (clubId) => {
    navigate(`/clubs/${clubId}/players`);

  };

  const handleClosePlayersModal = () => {
    setShowPlayersModal(false);
    setSelectedClubId(null);
    queryClient.removeQueries(["clubPlayers", selectedClubId]);
  };


// In Home.jsx, change the mutation function
const editPlayerMutation = useMutation({
  mutationFn: async (playerData) => {
    const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL;
    // Match the exact route from server: /api/player/players/:id
    const url = `${API_BASE_URL}/api/player/players/${playerData._id}`;
    console.log('Attempting to update player at URL:', url);
    
    const response = await fetch(url, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(playerData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: url
      });
      throw new Error(`Failed to update player: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('Update successful:', responseData);
    return responseData;
  },
  onError: (error) => {
    console.error("Update error:", {
      message: error.message,
      stack: error.stack
    });
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries(["clubPlayers", selectedClubId]);
    setShowEditPlayerModal(false);
    setSelectedPlayer(null);
  }
});
  

  
  const handleEditPlayer = (player) => {
    setSelectedPlayer(player);
    setShowEditPlayerModal(true);
  };
  const handleUpdatePlayer = async (updatedPlayerData) => {
    try {
      const cleanedData = {
        ...updatedPlayerData,
        _id: updatedPlayerData._id,
        name: updatedPlayerData.name,
        dateOfBirth: new Date(updatedPlayerData.dateOfBirth).toISOString(),
        position: updatedPlayerData.position,
        country: updatedPlayerData.country,
        rating: updatedPlayerData.rating || 1,
        currentClub: updatedPlayerData.currentClub?.club ? {
          club: updatedPlayerData.currentClub.club, // This should be a ClubTeam _id
          from: new Date(updatedPlayerData.currentClub.from).toISOString()
        } : null,
        previousClubs: updatedPlayerData.previousClubs
          .filter(club => club.name)
          .map(club => ({
            name: club.name, // This should be a ClubTeam _id
            from: new Date(club.from).toISOString(),
            to: new Date(club.to).toISOString()
          })),
        nationalTeams: updatedPlayerData.nationalTeams
          .filter(team => team.name && team.type)
          .map(team => ({
            name: team.name,
            type: team.type,
            from: new Date(team.from).toISOString(),
            to: team.currentlyPlaying ? null : team.to ? new Date(team.to).toISOString() : null
          }))
      };
      
      console.log('Sending data to server:', cleanedData); // Add this for debugging
      editPlayerMutation.mutate(cleanedData);
    } catch (error) {
      console.error("Error preparing data:", error);
    }
  };

  if (isLoading) return <Loader />;
  if (error) return <div>Error fetching data</div>;

  // Rest of the component remains exactly the same as before...
  return (
    <div className="ml-5">
      <div className="flex justify-center items-center gap-10 mt-5">
        <Input
          type="text"
          placeholder="Search clubs..."
          className="border border-gray-400 p-1"
          value={search}
          autoFocus
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={() => setShowAddModal(true)} variant="green">
          Add Club
        </Button>
      </div>

      <ClubsTable 
        data={data}
        onViewPlayers={handleViewPlayers}
        onEdit={(club) => {
          setSelectedClubId(club._id);
          setClubName(club.name);
          setShowEditModal(true);
        }}
        onDelete={(clubId) => {
          setSelectedClubId(clubId);
          setShowDeleteModal(true);
        }}
      />

      <div className="flex flex-row gap-5 justify-center mt-5">
        <Button onClick={() => setPage(page - 1)} disabled={page === 1}>
          Previous
        </Button>
        <Button
          onClick={() => setPage(page + 1)}
          disabled={!data || data.total <= page * data.perPage}
        >
          Next
        </Button>
        <span className="py-2">
          {page} of {data ? Math.ceil(data.total / data.perPage) : 1}
        </span>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Add Club
            </h2>
            <Input
              type="text"
              placeholder="Club Name"
              className="border border-gray-300 rounded p-2 w-full mb-4"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
            />
            <div className="flex justify-end gap-4">
              <Button
                onClick={() => {
                  setShowAddModal(false);
                  setClubName("");
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddClub}
                disabled={!clubName.trim()}
                variant="default"
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Edit Club
            </h2>
            <Input
              type="text"
              placeholder="New Club Name"
              className="border border-gray-300 rounded p-2 w-full mb-4"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
            />
            <div className="flex justify-end gap-4">
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setClubName("");
                  setSelectedClubId(null);
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditClub}
                disabled={!clubName.trim()}
                variant="yellow"
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Confirm Delete
            </h2>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete this club?
            </p>
            <div className="flex justify-end gap-4">
              <Button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedClubId(null);
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={handleDeleteClub} variant="destructive">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Players Modal */}
      {showPlayersModal && (
  <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 flex flex-col h-[90vh]">
      <div className="px-6 py-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Club Players</h2>
          <button
            onClick={handleClosePlayersModal}
            className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {playersData && <PlayersTable players={playersData} onEdit={handleEditPlayer} />}
      </div>

      <div className="px-6 py-4 border-t mt-auto">
        <div className="flex justify-end">
          <Button onClick={handleClosePlayersModal} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  </div>
)}
      {/* Edit Player Modal */}
      {showEditPlayerModal && selectedPlayer && positionsData && countriesData && data?.clubs && (
  <EditPlayerModal
    player={selectedPlayer}
    onClose={() => setShowEditPlayerModal(false)}
    onUpdate={handleUpdatePlayer}
    clubsData={data.clubs}
    positionsData={positionsData}
    countriesData={countriesData}
  />
)}
    </div>
  );
};

export default Home;