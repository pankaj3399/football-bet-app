import axios from '../utils/axiosConfig';

export const getCountries = async () => {
    const { data } = await axios.get(`/country`);
    return data;
}

export const getNationalTeams = async (country) => {
    const { data } = await axios.get(`/country/national-teams?country=${country}`);
    return data;
}