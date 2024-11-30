import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query';
import { getActiveClubs } from '../api/Clubs';
import { getPositions } from '../api/Position';
import { getCountries, getNationalTeams } from '../api/Country';
import { savePlayerData } from '../api/Player';
import Loader from './Loader/Loader';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Select from 'react-select';
import { useToast } from '../hooks/use-toast';

const AddPlayer = () => {

    const { toast } = useToast()

    const [player, setPlayer] = useState({
        name: '',
        dateOfBirth: '',
        position: '',
        currentClub: { club: '', from: '' },
        country: '',
        nationalTeams: [{ 
            name: '', 
            from: '', 
            to: '', 
            type: '', 
            teams: [], 
            disabled: true,
            currentlyPlaying: false 
        }],
        previousClubs: [{ name: '', from: '', to: '' }],
        rating: ''
    });

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

    const savePlayerDataMutation = useMutation({
        mutationFn: (playerData) => {
            // Clean up empty data before saving
            const cleanedData = {
                ...playerData,
                currentClub: playerData.currentClub.club ? playerData.currentClub : null,
                nationalTeams: playerData.nationalTeams
                    .filter(team => team.name && team.type)
                    .map(team => ({
                        ...team,
                        to: team.currentlyPlaying ? null : team.to // Set 'to' as null if currently playing
                    })),
                previousClubs: playerData.previousClubs.filter(club => club.name)
            };
            return savePlayerData(cleanedData);
        },
        onError: (error) => {
            if (error.response?.data?.msg === 'A player with the same name and date of birth already exists') {
                toast({
                    variant: "destructive",
                    title: "Duplicate Player",
                    description: "A player with this name and date of birth already exists",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Uh oh! Something went wrong.",
                    description: error.response?.data?.msg || "Failed to save player",
                });
            }
        },
        onSuccess: (data) => {
            toast({
                description: "Player saved successfully",
            });
        }
    });

    const fetchAllNationalTeams = async (country, index) => {
        const teams = await getNationalTeams(country);
        const teamsArray = teams.map(team => team.type);
        const updatedArray = [...player.nationalTeams];
        updatedArray[index].teams = teamsArray;
        updatedArray[index].disabled = false;
        setPlayer({ ...player, nationalTeams: updatedArray });
    }

    const handleAddPreviousClub = () => {
        setPlayer(prevState => ({
            ...prevState,
            previousClubs: [...prevState.previousClubs, { name: '', from: '', to: '' }]
        }));
    };

    const handleAddNationalTeam = () => {
        setPlayer(prevState => ({
            ...prevState,
            nationalTeams: [...prevState.nationalTeams, { 
                name: '', 
                from: '', 
                to: '', 
                type: '', 
                teams: [], 
                disabled: true,
                currentlyPlaying: false 
            }]
        }));
    };
    const handleCurrentlyPlayingChange = (index) => {
        const updatedNationalTeams = [...player.nationalTeams];
        updatedNationalTeams[index].currentlyPlaying = !updatedNationalTeams[index].currentlyPlaying;
        
        // Clear the 'to' date if currently playing is checked
        if (updatedNationalTeams[index].currentlyPlaying) {
            updatedNationalTeams[index].to = '';
        }
        
        setPlayer({ ...player, nationalTeams: updatedNationalTeams });
    };
    const handleInputChange = (e, field, index = null, subfield = null) => {
        const capitalizeName = (name) => {
            return name
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
                .trim();
        };
    
        // Get the value and capitalize if it's a name field
        const value = field === 'name' ? capitalizeName(e.target.value) : e.target.value;
    
        if (index !== null && subfield) {
            const updatedArray = [...player[field]];
            updatedArray[index][subfield] = e.target.value;
            setPlayer({ ...player, [field]: updatedArray });
        } else {
            setPlayer({ ...player, [field]: e.target.value });
        }
    };

    const handleClubInputChange = (e, field, subfield) => {
        setPlayer({ ...player, [field]: { ...player[field], [subfield]: e.target.value } });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        savePlayerDataMutation.mutate(player);
    };

    if(clubsDataLoading || positionsDataLoading || countriesDataLoading) {
        return <Loader />
    }

    return (
        <form onSubmit={handleSubmit} className="mx-10 p-6 bg-white shadow-md rounded-lg space-y-4">
            <div className="flex flex-col">
                <label className="font-semibold text-gray-700">Name:</label>
                <Input
                    type="text"
                    value={player.name}
                    onChange={(e) => handleInputChange(e, 'name')}
                    className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                />
            </div>
            <div className="flex flex-col">
                <label className="font-semibold text-gray-700">Date of Birth:</label>
                <Input
                    type="date"
                    value={player.dateOfBirth}
                    onChange={(e) => handleInputChange(e, 'dateOfBirth')}
                    className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                />
            </div>
            <div className="flex flex-col">
                <label className="font-semibold text-gray-700">Position:</label>
                <Select
                    value={{value:
                        player.position
                            ? positionsData.find(position => position._id === player.position)
                            : null,
                            label: player.position? positionsData.find(position => position._id === player.position).position : null
                    }}
                    onChange={(selectedOption) => handleInputChange(
                        { target: { value: selectedOption.value } },
                        'position'
                    )}
                    options={positionsData.map(position => ({
                        label: position.position,
                        value: position._id,
                    }))}
                    className="w-full"
                    placeholder="Select Position"
                    isSearchable
                />
            </div>
            <div className="flex flex-col">
                <label className="font-semibold text-gray-700">Current Club:</label>
                <Select
                    value={{
                        value:
                        player.currentClub.club
                            ? clubsData.find(club => club._id === player.currentClub.club)
                            : null,
                    
                        label: player.currentClub.club?
                            clubsData.find(club => club._id === player.currentClub.club).name
                            : null
                    }}
                    onChange={(selectedOption) => handleClubInputChange(
                        { target: { value: selectedOption.value } },
                        'currentClub',
                        'club'
                    )}
                    options={clubsData.map(club => ({
                        label: club.name,
                        value: club._id,
                    }))}
                    className="w-full"
                    placeholder="Select Club"
                    isSearchable
                />

                <label className="font-semibold text-gray-700 mt-2">From:</label>
                <Input
                    type="date"
                    value={player.currentClub.from}
                    onChange={(e) => handleClubInputChange(e, 'currentClub', 'from')}
                    className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
            </div>
            <div className="flex flex-col">
                <label className="font-semibold text-gray-700">Country:</label>
                <Select
                    value={{
                        value: player.country
                            ? countriesData.find(country => country._id === player.country)
                            : null,
                        label: player.country
                            ? countriesData.find(country => country._id === player.country).country
                            : null
                    }}
                    onChange={(selectedOption) => handleInputChange(
                        { target: { value: selectedOption.value } },
                        'country'
                    )}
                    options={countriesData.map(country => ({
                        label: country.country,
                        value: country._id,
                    }))}
                    className="w-full"
                    placeholder="Select Country"
                    isSearchable
                    required
                />
            </div>
            <div>
                <label className="font-semibold text-gray-700">National Teams:</label>
                {player.nationalTeams.map((team, index) => (
                    <div key={index} className="space-y-2 mb-4 p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-2 mb-2">
                            <Select
                                value={{ label: team.name, value: team.name }}
                                onChange={(selectedOption) => {
                                    handleInputChange(
                                        { target: { value: selectedOption.value } },
                                        'nationalTeams',
                                        index,
                                        'name'
                                    );
                                    fetchAllNationalTeams(selectedOption.value, index);
                                }}
                                options={countriesData.map(country => ({
                                    label: country.country,
                                    value: country.country,
                                }))}
                                className="w-full"
                                placeholder="Select National Team"
                                isSearchable
                            />
                            
                            <select
                                value={team.type}
                                onChange={(e) => handleInputChange(e, 'nationalTeams', index, 'type')}
                                className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="" disabled={team.disabled}>Select National Team Type</option>
                                {team.teams.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <label className="font-semibold text-gray-700">From:</label>
                                <Input
                                    type="date"
                                    value={team.from}
                                    onChange={(e) => handleInputChange(e, 'nationalTeams', index, 'from')}
                                    className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>

                            {!team.currentlyPlaying && (
                                <div className="flex items-center space-x-2">
                                    <label className="font-semibold text-gray-700">To:</label>
                                    <Input
                                        type="date"
                                        value={team.to}
                                        onChange={(e) => handleInputChange(e, 'nationalTeams', index, 'to')}
                                        className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`currently-playing-${index}`}
                                    checked={team.currentlyPlaying}
                                    onChange={() => handleCurrentlyPlayingChange(index)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <label 
                                    htmlFor={`currently-playing-${index}`}
                                    className="ml-2 text-sm font-medium text-gray-900 cursor-pointer"
                                >
                                    Currently Playing
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
                <Button
                    type="button"
                    onClick={handleAddNationalTeam}
                    className="mt-2 px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    Add National Team
                </Button>
            </div>


            <div>
                <label className="font-semibold text-gray-700">Previous Clubs:</label>
                {player.previousClubs.map((club, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                        <Select
                            value={{
                                value: player.previousClubs[index].name
                                    ? clubsData.find(club => club._id === player.previousClubs[index].name)
                                    : null,
                                label: player.previousClubs[index].name
                                    ? clubsData.find(club => club._id === player.previousClubs[index].name).name
                                    : null
                                }}
                            onChange={(selectedOption) =>
                                handleInputChange(
                                    { target: { value: selectedOption.value } },
                                    'previousClubs',
                                    index,
                                    'name'
                                )
                            }
                            options={clubsData.map(c => ({
                                label: c.name,
                                value: c._id,
                            }))}
                            className="w-full"
                            placeholder="Select Club"
                            isSearchable
                        />

                        <label className="font-semibold text-gray-700">From:</label>
                        <Input
                            type="date"
                            value={club.from}
                            onChange={(e) => handleInputChange(e, 'previousClubs', index, 'from')}
                            className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <label className="font-semibold text-gray-700">To:</label>
                        <Input
                            type="date"
                            value={club.to}
                            onChange={(e) => handleInputChange(e, 'previousClubs', index, 'to')}
                            className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                ))}
                <Button
                    type="button"
                    onClick={handleAddPreviousClub}
                    className="mt-2 px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    Add Previous Club
                </Button>
            </div>
            <Button
                type="submit"
                className="w-full px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            >
                Save Player
            </Button>

            {savePlayerDataMutation.isPending && <div>Saving player...</div>}
        </form>
    );
}

export default AddPlayer