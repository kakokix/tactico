// Villes fictives, modèles de noms de clubs et couleurs.
const s = (t) => t.split(',').map((x) => x.trim()).filter(Boolean);

export const CITIES = {
  FR: s('Valmont,Rochebrune,Montclair,Beaumarais,Saint-Aubin,Clairvaux,Port-Royan,Vauclerc,Lorvane,Castelnoir,Brémont,Villeneuve-d\'Azur,Sainte-Lucie,Fontclair,Mareuil,Montrivel,Pontarlès,Vernoux,Chantemerle,Rivedoux,Lanvallec,Kerbriand,Plouvenec,Arvenne,Lussac,Montbazin,Varennes,Esterel,Belcastel,Champvert,Haut-Maurin,Saint-Clair,Roquebel,Aiguebrune,Bellerive,Marsanne,Vauvert,Morlanne,Puyrenard,Lacanau-Ville,Croixval,Saint-Rambert'),
  EN: s('Blackmoor,Kingsbridge,Ravenshaw,Eastwick,Thornbury,Westmere,Hollowford,Stonebridge,Northam,Redcliffe,Ashby,Greywater,Langton,Brambleton,Fairhaven,Oakridge,Kingsmere,Wolverley,Elmsworth,Bramwell,Mossley,Whitcombe,Pemberton,Linwood,Fenwick,Calder,Rotherfield,Hazelmere,Southwold,Dunmore,Halford,Coldbrook,Riverton,Saltmarsh,Wexley,Thornhill,Ironbridge,Highcastle,Marlowe,Bridgefield,Copperton,Ashcombe'),
  ES: s('Villaverde,San Andrés,Montealto,Valdeluz,Robledo,Castellmar,Torremolar,Peñaroja,Riosol,Valleseco,Aldeanueva,Monteblanco,Torrealta,Benicalm,Sierra Clara,Navalpino,Vegaluz,Costaverde,Puerto Lindo,Cabo Real,Ribagorza,Campoalto,Arenales,Albamar,Castrillo,Olivares,Valdemar,Peñalta,Ríoclaro,Fuenteluna,San Telmo,Las Palmeras,Monteluz,Almenara,Torrevieja Alta,Santa Brisa,Puerto Sol,Valdeolmos,Bahía Azul,Sotoverde,Lomaclara,Miramar'),
  IT: s('Montecalvo,Castelverde,San Lorenzo,Villafiore,Portonovo,Rivalta,Borgomare,Montesole,Valdoro,Pietralba,Fontanella,Castelrosso,Torrebianca,Acquaviva,Roccalta,Montefiore,Campolargo,Lagonero,Belvedere,Serravalle,Monteverde,Casalbuono,Pontealto,Collebello,Vallerosa,Marinella,Santa Chiara,Poggio Alto,Fiumara,Castelmare,Altavilla,Rocca Bianca,Pratoverde,Sassonero,Borgoforte,Lunamare,Terrasanta,Valcastello,Montebruno,Capo Sereno,Lucentino,Vignalunga'),
  DE: s('Rheinfeld,Waldheim,Steinbach,Lindenau,Rosental,Falkenberg,Eichstadt,Hohenwald,Bergheim,Altenburg,Grünwald,Schönau,Kronach,Adlershof,Marienfeld,Blumenthal,Wolfsberg,Sonnenfeld,Hirschau,Bachstein,Ostermark,Weidenau,Brückenau,Lichtenfeld,Tannenberg,Buchholz,Felsenau,Rotheim,Wiesental,Hafenstadt,Moorbach,Seeburg,Kirchberg,Dornstadt,Ehrenfeld,Fuchsberg,Lindenhof,Hagenau,Eisenfels,Silberbach,Neuhafen,Talheim'),
};

export const CLUB_PATTERNS = {
  FR: ['FC {c}', 'Olympique {c}', 'AS {c}', 'Racing {c}', 'Stade {c}', 'SC {c}', 'US {c}', '{c} FC', 'AJ {c}', 'Sporting {c}', 'Union {c}', 'ES {c}', 'Entente {c}', 'Athletic {c}'],
  EN: ['{c} United', '{c} City', '{c} Rovers', '{c} Athletic', '{c} Town', '{c} Wanderers', '{c} Albion', '{c} County', '{c} FC', '{c} Rangers', '{c} Forest', '{c} Harriers', '{c} Villa', '{c} Hotspur'],
  ES: ['Real {c}', 'Atlético {c}', 'CD {c}', 'UD {c}', 'Deportivo {c}', 'SD {c}', 'Racing {c}', '{c} CF', 'CF {c}', 'Sporting {c}', 'RCD {c}', 'Club {c}', 'Unión {c}', 'Gimnástica {c}'],
  IT: ['AC {c}', 'US {c}', '{c} Calcio', 'AS {c}', 'SS {c}', 'Sporting {c}', 'Virtus {c}', 'Pro {c}', '{c} FC', 'Unione {c}', 'Real {c}', 'Atletico {c}', 'Polisportiva {c}', 'Juve {c}'],
  DE: ['FC {c}', 'VfB {c}', 'SV {c}', 'Borussia {c}', 'TSV {c}', '1. FC {c}', 'Fortuna {c}', 'Eintracht {c}', 'SC {c}', 'Alemannia {c}', 'Union {c}', 'Rot-Weiss {c}', 'SpVgg {c}', 'Viktoria {c}'],
};

export const STADIUM_PATTERNS = {
  FR: ['Stade de {c}', 'Stade Municipal', 'Parc de {c}', 'Stade des Lumières', 'Stade du Lac', 'Stade Jean-Moulin', 'Stade de la Colline', 'Arena {c}'],
  EN: ['{c} Park', '{c} Road', 'The {c} Ground', 'Victoria Park', 'Riverside Stadium', '{c} Lane', 'Kingsway', 'The Meadow'],
  ES: ['Estadio {c}', 'Estadio Municipal', 'Nuevo Estadio', 'Estadio del Sol', 'Estadio La Rosaleda Nueva', 'Campo de {c}', 'Estadio Ciudad de {c}'],
  IT: ['Stadio {c}', 'Stadio Comunale', 'Stadio dei Pini', 'Stadio del Mare', 'Arena {c}', 'Stadio Olimpico di {c}', 'Stadio Città di {c}'],
  DE: ['{c}-Arena', 'Stadion {c}', 'Waldstadion', 'Sportpark {c}', 'Volksparkstadion {c}', 'Am Fluss', '{c}er Kampfbahn'],
};

// Couleurs [principale, secondaire]
export const COLORS = [
  ['#d62828', '#ffffff'], ['#1d4ed8', '#ffffff'], ['#111827', '#ffffff'], ['#15803d', '#ffffff'], ['#facc15', '#111827'],
  ['#6d28d9', '#ffffff'], ['#0ea5e9', '#ffffff'], ['#ea580c', '#111827'], ['#be123c', '#facc15'], ['#1e3a8a', '#facc15'],
  ['#065f46', '#facc15'], ['#f8fafc', '#d62828'], ['#f8fafc', '#1d4ed8'], ['#f8fafc', '#111827'], ['#7f1d1d', '#93c5fd'],
  ['#991b1b', '#111827'], ['#0f766e', '#ffffff'], ['#84cc16', '#111827'], ['#db2777', '#111827'], ['#475569', '#ffffff'],
  ['#1e40af', '#dc2626'], ['#dc2626', '#1e40af'], ['#0a0a0a', '#facc15'], ['#4c1d95', '#facc15'], ['#0369a1', '#f8fafc'],
  ['#b45309', '#f8fafc'], ['#166534', '#f8fafc'], ['#9f1239', '#f8fafc'],
];
