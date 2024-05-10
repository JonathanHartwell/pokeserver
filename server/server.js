const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());

app.get('/pokemon', async (req, res) => {
    try {
        const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=1025');
        const pokemonList = response.data.results;
        
        // Fetch details of all Pokémon in parallel
        const pokemonDetailsPromises = pokemonList.map(async (pokemon, index) => {
            try {
                const speciesResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${index + 1}`);
                const speciesData = speciesResponse.data;
                return {
                    id: index + 1,
                    name: pokemon.name,
                    generation: speciesData.generation.name
                };
            } catch (error) {
                console.error('Error fetching species data:', error);
                return null;
            }
        });
        
        const resolvedPokemonDetails = await Promise.all(pokemonDetailsPromises);
        const filteredPokemonDetails = resolvedPokemonDetails.filter(pokemon => pokemon !== null);
        res.json(filteredPokemonDetails);
    } catch (theseHands) {
        console.error('Error fetching Pokemon list:', theseHands);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



app.get('/pokemon/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const speciesResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
        await new Promise(resolve => setTimeout(resolve, 5));
        const speciesData = speciesResponse.data;

        const pokemonResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const pokemonData = pokemonResponse.data;

        const cardData = {
            id: pokemonData.id,
            name: pokemonData.name,
            national_pokedex_number: speciesData.pokedex_numbers.find(entry => entry.pokedex.name === 'national').entry_number,
            sprite: pokemonData.sprites.front_default,
            sprite_shiny: pokemonData.sprites.front_shiny,
            sprite_f: pokemonData.sprites.front_female,
            sprite_f_shiny: pokemonData.sprites.front_shiny_female,
            types: pokemonData.types.map(type => type.type.name),
            is_baby: speciesData.is_baby ? 'B' : '',
            is_legendary: speciesData.is_legendary ? 'L' : '',
            is_mythical: speciesData.is_mythical ? 'M' : '',
            generation: speciesData.generation.name,
            varieties: []
        };

        // Iterate through varieties and extract data
        for (const variety of speciesData.varieties) {
            if (variety.pokemon.name !== pokemonData.name) {
                const varietyResponse = await axios.get(variety.pokemon.url);
                const varietyData = varietyResponse.data;
        
                // check name.name includes only one "-" so gmax, mega-evolutions, ect. arent returned.
                const nameParts = varietyData.name.toLowerCase().split("-");
                const includesSpecifiedPatterns = nameParts.length === 2 && ['alola', 'galar', 'hisui', 'paldea']
                    .some(pattern => nameParts[1].includes(pattern));
        
                if (includesSpecifiedPatterns) {
                    const varietyCardData = {
                        name: varietyData.name,
                        sprite: varietyData.sprites.front_default,
                        sprite_shiny: varietyData.sprites.front_shiny,
                        sprite_f: varietyData.sprites.front_female,
                        sprite_f_shiny: varietyData.sprites.front_shiny_female,
                        types: varietyData.types.map(type => type.type.name)
                    };
        
                    cardData.varieties.push(varietyCardData);
                }
            }
        }

        res.json(cardData);
    } catch (theseHands) {
        console.error('Error fetching data:', theseHands);
        res.status(500).json({ theseHands: 'Internal Server Error' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
