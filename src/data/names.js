// Nationalités et listes de noms (combinaisons aléatoires, joueurs fictifs).
const s = (t) => t.split(',').map((x) => x.trim()).filter(Boolean);

const FR_F = s('Lucas,Hugo,Théo,Nathan,Enzo,Louis,Mathis,Tom,Noah,Maxime,Antoine,Clément,Baptiste,Quentin,Alexis,Romain,Julien,Kévin,Bastien,Florian,Adrien,Valentin,Yanis,Rayan,Ilyes,Wissam,Moussa,Ibrahima,Samuel,Jordan,Dylan,Killian,Mathéo,Evan,Nolan,Axel,Sacha,Malo,Timothé,Corentin,Benjamin,Loïc,Anthony,Rémi,Steve,Yoann,Aurélien,Gaëtan');
const FR_L = s('Martin,Bernard,Dubois,Durand,Leroy,Moreau,Laurent,Lefebvre,Michel,Garcia,Bertrand,Roux,Vincent,Fournier,Morel,Girard,Mercier,Dupont,Lambert,Bonnet,Legrand,Garnier,Faure,Rousseau,Blanc,Guérin,Henry,Roussel,Perrin,Morin,Mathieu,Clément,Gauthier,Dumont,Fontaine,Chevalier,Robin,Masson,Boyer,Lemaire,Duval,Joly,Roche,Noël,Meunier,Marchand,Dufour,Blanchard,Barbier,Brunet,Leroux,Colin,Renard,Arnaud,Caron,Aubert,Giraud,Leclerc,Vidal,Bourgeois,Renaud,Lemoine,Picard,Gaillard,Lacroix,Fabre,Dupuis,Hubert,Guillot,Rivière,Le Gall,Moulin,Berger,Lecomte,Fleury,Carpentier,Maillard,Aubry,Vasseur,Jacquet,Collet,Prévost,Poirier,Charpentier,Royer,Baron,Pons,Breton,Perrot,Guyot,Marty,Diallo,Traoré,Koné,Camara,Diop,Touré,Cissé,Coulibaly,Keita,Sylla,Kamara,Benali,Haddad,Ferreira,Da Costa');
const EN_F = s('Harry,Jack,Oliver,James,George,Charlie,Jacob,Thomas,Alfie,Joshua,William,Daniel,Henry,Ethan,Mason,Leo,Callum,Ryan,Lewis,Jordan,Kieran,Reece,Connor,Liam,Aaron,Ben,Sam,Joe,Luke,Owen,Tyler,Kyle,Dominic,Declan,Marcus,Jamal,Freddie,Archie,Toby,Max,Elliot,Jamie,Nathaniel,Kai,Morgan');
const EN_L = s('Smith,Jones,Taylor,Brown,Williams,Johnson,Robinson,Wright,Thompson,Evans,Roberts,Green,Hall,Wood,Jackson,Hughes,Edwards,Turner,Hill,Moore,Cooper,Ward,Morris,King,Watson,Harris,Baker,Morgan,Young,Allen,Mitchell,Bell,Carter,Phillips,Bennett,Parker,Kelly,Price,Hunt,Barnes,Holmes,Mills,Palmer,Fisher,Lloyd,Fletcher,Grant,Barker,Gibson,Stevens,Webb,Chapman,Ellis,Butler,Russell,Marshall,Dixon,Hayes,Spencer,Saunders,Okafor,Mensah,Boateng,Campbell,Reid,Holloway,Pritchard,Hargreaves,Whitfield,Thornton,Ashworth,Kendall');
const ES_F = s('Alejandro,Pablo,Daniel,Sergio,Carlos,Adrián,David,Álvaro,Diego,Iván,Rubén,Marcos,Jorge,Hugo,Iker,Unai,Mikel,Óscar,Andrés,Miguel,Samuel,Aitor,Borja,Dani,Lucas,Ander,Jon,Asier,Gorka,Alberto,Héctor,Joel,Izan,Martí,Pau,Bruno,Eric,Roberto');
const ES_L = s('García,Fernández,González,Rodríguez,López,Martínez,Sánchez,Pérez,Gómez,Martín,Jiménez,Ruiz,Hernández,Díaz,Muñoz,Álvarez,Romero,Navarro,Domínguez,Gil,Ramírez,Serrano,Molina,Morales,Suárez,Ortega,Delgado,Castro,Ortiz,Rubio,Marín,Sanz,Núñez,Medina,Garrido,Cortés,Castillo,Santos,Lozano,Guerrero,Cano,Prieto,Méndez,Calvo,Gallego,León,Márquez,Peña,Flores,Cabrera,Campos,Vega,Fuentes,Carrasco,Caballero,Reyes,Nieto,Aguilar,Pascual,Herrero,Lorenzo,Montero,Hidalgo,Ibáñez,Ferrer,Benítez,Mora,Vicente,Arias,Carmona,Crespo,Parra,Esteban,Bravo,Etxeberria,Zubizarreta,Valero,Bermúdez,Quintana,Salinas,Robles,Pizarro');
const IT_F = s('Lorenzo,Alessandro,Francesco,Matteo,Andrea,Gabriele,Leonardo,Riccardo,Tommaso,Davide,Marco,Luca,Federico,Simone,Nicolò,Giorgio,Emanuele,Stefano,Antonio,Pietro,Filippo,Daniele,Alessio,Michele,Roberto,Salvatore,Vincenzo,Mattia,Gianluca,Fabio,Claudio,Dario,Manuel,Edoardo,Cristian,Christian,Elia,Jacopo,Diego');
const IT_L = s('Rossi,Russo,Ferrari,Esposito,Bianchi,Romano,Marino,Greco,Bruno,Gallo,Conti,De Luca,Costa,Giordano,Rizzo,Lombardi,Moretti,Barbieri,Fontana,Santoro,Mariani,Rinaldi,Caruso,Ferrara,Galli,Martini,Leone,Longo,Gentile,Martinelli,Vitale,Serra,Coppola,De Santis,D\'Angelo,Marchetti,Parisi,Villa,Ferraro,Ferri,Fabbri,Bianco,Marini,Grasso,Valentini,Messina,Sala,De Angelis,Palumbo,Sanna,Farina,Rizzi,Monti,Cattaneo,Morelli,Amato,Silvestri,Mazza,Testa,Grassi,Carbone,Giuliani,Benedetti,Barone,Rossetti,Caputo,Montanari,Guerra,Palmieri,Bernardi,Fiore,De Rosa,Ferretti,Bellini,Basile,Riva,Donati,Piras,Vitali,Battaglia,Sartori,Neri,Milani,Pagano,Orlando,Bellucci,Mazzola,Ferrante,Lucchesi,Bertolini');
const DE_F = s('Lukas,Leon,Finn,Jonas,Paul,Elias,Luca,Felix,Maximilian,Noah,Ben,Tim,Jan,Niklas,Moritz,Julian,Florian,Tobias,Sebastian,Fabian,Kevin,Marco,Dennis,Patrick,Marcel,Kai,Timo,Jannik,Lennart,Mats,Malte,Nico,Robin,Philipp,Dominik,Jonathan,Leroy,Karim,Emre,Deniz');
const DE_L = s('Müller,Schmidt,Schneider,Fischer,Weber,Meyer,Wagner,Becker,Hoffmann,Schäfer,Bauer,Richter,Klein,Wolf,Schröder,Neumann,Schwarz,Zimmermann,Braun,Krüger,Hartmann,Lange,Schmitz,Krause,Meier,Lehmann,Schmid,Schulze,Maier,Köhler,Herrmann,König,Walter,Mayer,Huber,Kaiser,Fuchs,Peters,Lang,Scholz,Möller,Weiß,Jung,Hahn,Schubert,Vogel,Friedrich,Keller,Günther,Frank,Berger,Winkler,Roth,Beck,Lorenz,Baumann,Franke,Albrecht,Schuster,Ludwig,Böhm,Winter,Kraus,Schumacher,Krämer,Vogt,Stein,Jäger,Otto,Sommer,Groß,Seidel,Haas,Graf,Dietrich,Ziegler,Kuhn,Engel,Horn,Busch,Bergmann,Voigt,Wolff,Yilmaz,Öztürk,Demir,Brenner,Kessler,Lindner,Pohl,Riedel');
const PT_F = s('João,Rúben,Rafael,Gonçalo,Tiago,Nuno,Rui,Vítor,Miguel,Francisco,Duarte,Martim,Rodrigo,Afonso,Henrique,Simão,Tomás,Guilherme,Lourenço');
const PT_L = s('Silva,Santos,Ferreira,Pereira,Oliveira,Costa,Rodrigues,Martins,Sousa,Fernandes,Gonçalves,Gomes,Lopes,Marques,Alves,Almeida,Ribeiro,Pinto,Carvalho,Teixeira,Moreira,Correia,Nunes,Soares,Vieira,Monteiro,Cardoso,Rocha,Coelho,Cruz,Barros,Pacheco,Valente,Tavares');
const BR_F = s('Gabriel,Lucas,Matheus,Pedro,Guilherme,Rafael,Felipe,Gustavo,Bruno,Vinícius,Rodrigo,João,Caio,Diego,Leandro,Fábio,Éverton,Wesley,Douglas,Igor,Danilo,Renan,Murilo,Talles,Kauã,Breno,Luan,Arthur');
const BR_L = s('Silva,Santos,Souza,Oliveira,Pereira,Lima,Carvalho,Ferreira,Rodrigues,Almeida,Gomes,Martins,Araújo,Rocha,Dias,Nascimento,Moreira,Cardoso,Teixeira,Correia,Machado,Freitas,Batista,Monteiro,Mendonça,Prado,Sampaio,Viana');
const AR_F = s('Santiago,Mateo,Juan,Matías,Tomás,Facundo,Franco,Agustín,Joaquín,Gonzalo,Leandro,Thiago,Valentín,Exequiel,Nahuel,Bautista,Ignacio,Benjamín,Ramiro');
const AR_L = s('González,Rodríguez,Gómez,Fernández,López,Díaz,Martínez,Pérez,Romero,Sosa,Álvarez,Torres,Ruiz,Ramírez,Flores,Acosta,Benítez,Herrera,Suárez,Aguirre,Pereyra,Gutiérrez,Castro,Rojas,Ortiz,Ledesma,Cabral,Barrios,Villalba,Quiroga,Maidana,Coronel');
const NL_F = s('Daan,Sem,Milan,Levi,Luuk,Bram,Thijs,Jesse,Lars,Ruben,Stijn,Tim,Joey,Wout,Teun,Jurriën,Kees,Sven,Niels,Xavi');
const NL_L = s('de Jong,Jansen,de Vries,van den Berg,van Dijk,Bakker,Janssen,Visser,Smit,Meijer,de Boer,Mulder,de Groot,Bos,Vos,Peters,Hendriks,van Leeuwen,Dekker,Brouwer,de Wit,Dijkstra,Smits,de Graaf,van der Meer,Koopmeiners,Timber,Veltman');
const AF_F = s('Moussa,Ibrahima,Cheikh,Mamadou,Pape,Sadio,Kalidou,Babacar,Youssouf,Ousmane,Amadou,Serge,Wilfried,Franck,Yao,Kouadio,Jérémie,Simon,Christian,Samuel,André,Vincent,Bryan,Junior,Aliou,Boubacar,Souleymane,Alassane,Didier,Hervé');
const SN_L = s('Diop,Ndiaye,Fall,Sarr,Diallo,Gueye,Faye,Seck,Mbaye,Ba,Sow,Cissé,Niang,Thiam,Kouyaté,Diatta,Mendy,Sène,Diédhiou,Badji');
const CI_L = s('Koné,Kouassi,Bamba,Traoré,Touré,Diomandé,Coulibaly,Konan,Boly,Gbamin,Doumbia,Fofana,Sangaré,Ouattara,Kossounou,Seri,Gnagnon,Kacou,Zoro');
const CM_L = s('Ngono,Mballa,Essomba,Atangana,Owona,Mvondo,Fouda,Nana,Tchami,Mbarga,Abanda,Ndzana,Eyenga,Manga,Kamga,Talla,Djeumo,Ngando');
const NG_F = s('Victor,Samuel,Ahmed,Kelechi,Emeka,Tolu,Femi,Tunde,Chidi,Ola,Segun,Bayo,Ifeanyi,Uche,David,Peter');
const NG_L = s('Okafor,Eze,Okonkwo,Nwankwo,Obi,Adeyemi,Balogun,Ibe,Onyekachi,Okoro,Adebayo,Olawale,Bello,Ogunleye,Chukwu,Nnamdi,Afolabi,Oyelaran');
const MA_F = s('Achraf,Hakim,Youssef,Sofiane,Noussair,Azzedine,Bilal,Ilias,Amine,Zakaria,Yassine,Selim,Ayoub,Anass,Oussama,Ismael');
const MA_L = s('El Amrani,Benjelloun,Alaoui,Bennani,Berrada,Tazi,Chraibi,Lahlou,El Fassi,Ouazzani,Saidi,Mansouri,Rachidi,Belhaj,Hajji,Bakkali,Zerouali,El Idrissi,Lamrani,Ouali');
const DZ_F = s('Riyad,Islam,Ismaël,Ramy,Saïd,Nabil,Yacine,Adam,Rayan,Aïssa,Mehdi,Farès,Houssem,Amine,Hicham,Billel');
const DZ_L = s('Belkacem,Boudiaf,Hamidi,Saadi,Brahimi,Cherif,Kaci,Larbi,Meziane,Rahmani,Taleb,Zerrouki,Ziani,Bensaïd,Djebbar,Benyahia,Chergui,Mekki,Hadjadj');
const HR_F = s('Luka,Ivan,Marko,Josip,Mateo,Ante,Nikola,Mario,Domagoj,Andrej,Lovro,Borna,Dominik,Petar');
const HR_L = s('Horvat,Kovačević,Babić,Marić,Jurić,Novak,Knežević,Vuković,Marković,Petrović,Matić,Pavlović,Perić,Šimić,Bošnjak,Radić,Tomić,Grgić');
const PL_F = s('Jakub,Kacper,Szymon,Filip,Mateusz,Bartosz,Kamil,Piotr,Łukasz,Krzysztof,Michał,Adrian,Sebastian,Wojciech');
const PL_L = s('Nowak,Kowalski,Wiśniewski,Wójcik,Kowalczyk,Lewandowski,Woźniak,Dąbrowski,Jankowski,Mazur,Krawczyk,Grabowski,Pawłowski,Wróbel,Sikora,Michalski,Baran,Kubiak');
const DK_F = s('Mikkel,Rasmus,Mads,Frederik,Jonas,Christian,Emil,Oliver,Magnus,Kasper,Simon,Victor,Lasse,Anders');
const DK_L = s('Jensen,Nielsen,Hansen,Pedersen,Andersen,Christensen,Larsen,Sørensen,Rasmussen,Jørgensen,Petersen,Madsen,Kristensen,Olsen,Thomsen,Lund,Holm,Bach');
const SE_L = s('Johansson,Andersson,Karlsson,Nilsson,Eriksson,Larsson,Olsson,Persson,Svensson,Gustafsson,Lindgren,Berg,Lindqvist,Ekdal');
const NO_L = s('Hansen,Johansen,Olsen,Larsen,Andersen,Pedersen,Nilsen,Kristiansen,Jensen,Berg,Haugen,Solbakken,Strand,Moen,Lie');
const SC_F = s('Erik,Oscar,Viktor,Elias,Isak,Anton,Axel,Ludvig,Sander,Martin,Kristoffer,Henrik,Jørgen,Fredrik');
const US_F = s('Christian,Tyler,Weston,Brenden,Gio,Josh,Zack,Matt,Kellyn,Chris,Miles,Ricardo,DeAndre,Jordan,Caleb,Malik');
const US_L = s('Johnson,Miller,Davis,Anderson,Robinson,Turner,Carter,Brooks,Wright,Hayes,Coleman,Bailey,Perry,Foster,Russell,Griffin,Hamilton,Graham,Sullivan,Wallace');
const JP_F = s('Takumi,Kaoru,Daichi,Ritsu,Takefusa,Wataru,Hiroki,Junya,Yuto,Ko,Kyogo,Ayase,Daizen,Reo,Shogo,Kenta');
const JP_L = s('Tanaka,Suzuki,Takahashi,Watanabe,Ito,Yamamoto,Nakamura,Kobayashi,Kato,Yoshida,Yamada,Sasaki,Matsumoto,Inoue,Kimura,Hayashi,Shimizu,Mori,Ogawa,Fujita');
const KR_F = s('Min-jun,Seo-jun,Do-yun,Ye-jun,Si-woo,Ha-joon,Ju-won,Ji-ho,Jun-seo,Hyun-woo,Dong-hyun,Sung-min');
const KR_L = s('Kim,Lee,Park,Choi,Jung,Kang,Cho,Yoon,Jang,Lim,Han,Oh,Seo,Hwang');
const RS_F = s('Dušan,Aleksandar,Nemanja,Sergej,Filip,Luka,Strahinja,Nikola,Veljko,Uroš,Lazar,Miloš');
const RS_L = s('Jovanović,Petrović,Nikolić,Marković,Đorđević,Stojanović,Ilić,Stanković,Pavlović,Milošević,Živković,Savić,Ristić,Popović');
const CH_L = s('Müller,Meier,Schmid,Keller,Weber,Huber,Frei,Brunner,Baumann,Gerber,Moser,Steiner,Zürcher,Graf,Roth,Bühler');
const UY_L = s('Rodríguez,Pérez,González,Fernández,López,Martínez,Sosa,Silva,Pereira,Díaz,Castro,Méndez,Acosta,Cabrera,Correa,Píriz,Olivera,Techera');
const CO_L = s('Rodríguez,Gómez,Díaz,Martínez,Cuesta,Sánchez,Ríos,Mosquera,Valencia,Palacios,Rentería,Castaño,Zapata,Hurtado,Murillo,Asprilla');
const TN_L = s('Ben Ali,Trabelsi,Gharbi,Jlassi,Hammami,Bouazizi,Mejri,Saidi,Ayari,Chaabane,Ferchichi,Mabrouk,Ben Salah,Dridi');
const ML_L = s('Traoré,Diarra,Keïta,Coulibaly,Koné,Sangaré,Touré,Camara,Konaté,Maïga,Cissé,Diakité,Kanouté,Dicko,Samaké,Tounkara');
const GH_F = s('Kwame,Kofi,Yaw,Kojo,Kwabena,Kwesi,Ebo,Nana,Fiifi,Kweku,Isaac,Emmanuel');
const GH_L = s('Mensah,Asamoah,Owusu,Opoku,Agyeman,Appiah,Darko,Frimpong,Acheampong,Ofori,Amoah,Badu,Tetteh,Quaye');
const TR_F = s('Arda,Kerem,Hakan,Ferdi,Cengiz,Orkun,Kaan,Merih,Ozan,Yunus,Semih,Kenan,Oğuz,Emir,Mert');
const TR_L = s('Yılmaz,Kaya,Demir,Şahin,Çelik,Yıldırım,Öztürk,Aydın,Özdemir,Arslan,Doğan,Kılıç,Aslan,Koç,Polat,Erdem,Ünal,Taş');

export const NATIONS = {
  FR: { name: 'France', flag: '🇫🇷', f: FR_F, l: FR_L },
  EN: { name: 'Angleterre', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', f: EN_F, l: EN_L },
  ES: { name: 'Espagne', flag: '🇪🇸', f: ES_F, l: ES_L },
  IT: { name: 'Italie', flag: '🇮🇹', f: IT_F, l: IT_L },
  DE: { name: 'Allemagne', flag: '🇩🇪', f: DE_F, l: DE_L },
  PT: { name: 'Portugal', flag: '🇵🇹', f: PT_F, l: PT_L },
  BR: { name: 'Brésil', flag: '🇧🇷', f: BR_F, l: BR_L },
  AR: { name: 'Argentine', flag: '🇦🇷', f: AR_F, l: AR_L },
  NL: { name: 'Pays-Bas', flag: '🇳🇱', f: NL_F, l: NL_L },
  BE: { name: 'Belgique', flag: '🇧🇪', f: [...FR_F.slice(0, 20), ...NL_F.slice(0, 12)], l: [...FR_L.slice(0, 40), ...NL_L.slice(0, 15)] },
  SN: { name: 'Sénégal', flag: '🇸🇳', f: AF_F, l: SN_L },
  CI: { name: "Côte d'Ivoire", flag: '🇨🇮', f: AF_F, l: CI_L },
  CM: { name: 'Cameroun', flag: '🇨🇲', f: AF_F, l: CM_L },
  ML: { name: 'Mali', flag: '🇲🇱', f: AF_F, l: ML_L },
  GH: { name: 'Ghana', flag: '🇬🇭', f: GH_F, l: GH_L },
  NG: { name: 'Nigeria', flag: '🇳🇬', f: NG_F, l: NG_L },
  MA: { name: 'Maroc', flag: '🇲🇦', f: MA_F, l: MA_L },
  DZ: { name: 'Algérie', flag: '🇩🇿', f: DZ_F, l: DZ_L },
  TN: { name: 'Tunisie', flag: '🇹🇳', f: [...MA_F, ...DZ_F.slice(0, 8)], l: TN_L },
  HR: { name: 'Croatie', flag: '🇭🇷', f: HR_F, l: HR_L },
  RS: { name: 'Serbie', flag: '🇷🇸', f: RS_F, l: RS_L },
  PL: { name: 'Pologne', flag: '🇵🇱', f: PL_F, l: PL_L },
  DK: { name: 'Danemark', flag: '🇩🇰', f: DK_F, l: DK_L },
  SE: { name: 'Suède', flag: '🇸🇪', f: SC_F, l: SE_L },
  NO: { name: 'Norvège', flag: '🇳🇴', f: SC_F, l: NO_L },
  CH: { name: 'Suisse', flag: '🇨🇭', f: [...DE_F.slice(0, 15), ...FR_F.slice(0, 10)], l: CH_L },
  TR: { name: 'Turquie', flag: '🇹🇷', f: TR_F, l: TR_L },
  US: { name: 'États-Unis', flag: '🇺🇸', f: US_F, l: US_L },
  UY: { name: 'Uruguay', flag: '🇺🇾', f: AR_F, l: UY_L },
  CO: { name: 'Colombie', flag: '🇨🇴', f: [...ES_F.slice(0, 15), ...AR_F.slice(0, 10)], l: CO_L },
  JP: { name: 'Japon', flag: '🇯🇵', f: JP_F, l: JP_L },
  KR: { name: 'Corée du Sud', flag: '🇰🇷', f: KR_F, l: KR_L },
};
// Nationalités supplémentaires (joueurs réels). Les listes de noms servent seulement de secours.
const EXTRA = {
  EC: ['Équateur', '🇪🇨', AR_F, CO_L], SCO: ['Écosse', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', EN_F, EN_L], WAL: ['Pays de Galles', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', EN_F, EN_L],
  NIR: ['Irlande du Nord', '🇬🇧', EN_F, EN_L], IE: ['Irlande', '🇮🇪', EN_F, EN_L], AT: ['Autriche', '🇦🇹', DE_F, DE_L],
  CZ: ['Tchéquie', '🇨🇿', PL_F, PL_L], SK: ['Slovaquie', '🇸🇰', PL_F, PL_L], SI: ['Slovénie', '🇸🇮', HR_F, HR_L],
  HU: ['Hongrie', '🇭🇺', HR_F, HR_L], UA: ['Ukraine', '🇺🇦', PL_F, PL_L], GE: ['Géorgie', '🇬🇪', RS_F, RS_L],
  GR: ['Grèce', '🇬🇷', RS_F, RS_L], AL: ['Albanie', '🇦🇱', HR_F, HR_L], XK: ['Kosovo', '🇽🇰', HR_F, HR_L],
  BA: ['Bosnie-Herzégovine', '🇧🇦', RS_F, RS_L], ME: ['Monténégro', '🇲🇪', RS_F, RS_L], MK: ['Macédoine du Nord', '🇲🇰', RS_F, RS_L],
  IS: ['Islande', '🇮🇸', SC_F, NO_L], FI: ['Finlande', '🇫🇮', SC_F, SE_L], EE: ['Estonie', '🇪🇪', SC_F, SE_L],
  LT: ['Lituanie', '🇱🇹', PL_F, PL_L], RO: ['Roumanie', '🇷🇴', RS_F, RS_L], BG: ['Bulgarie', '🇧🇬', RS_F, RS_L],
  RU: ['Russie', '🇷🇺', PL_F, PL_L], CD: ['RD Congo', '🇨🇩', AF_F, CM_L], GN: ['Guinée', '🇬🇳', AF_F, ML_L],
  BF: ['Burkina Faso', '🇧🇫', AF_F, ML_L], GM: ['Gambie', '🇬🇲', AF_F, SN_L], GA: ['Gabon', '🇬🇦', AF_F, CM_L],
  GW: ['Guinée-Bissau', '🇬🇼', AF_F, SN_L], BJ: ['Bénin', '🇧🇯', AF_F, CI_L], MZ: ['Mozambique', '🇲🇿', AF_F, CM_L],
  ZW: ['Zimbabwe', '🇿🇼', NG_F, NG_L], ZM: ['Zambie', '🇿🇲', NG_F, NG_L], AO: ['Angola', '🇦🇴', AF_F, CM_L],
  CG: ['Congo', '🇨🇬', AF_F, CM_L], GQ: ['Guinée équatoriale', '🇬🇶', AF_F, CM_L], CV: ['Cap-Vert', '🇨🇻', PT_F, PT_L],
  EG: ['Égypte', '🇪🇬', MA_F, MA_L], JO: ['Jordanie', '🇯🇴', MA_F, MA_L], SA: ['Arabie saoudite', '🇸🇦', MA_F, MA_L],
  IL: ['Israël', '🇮🇱', EN_F, EN_L], UZ: ['Ouzbékistan', '🇺🇿', TR_F, TR_L], ID: ['Indonésie', '🇮🇩', NL_F, NL_L],
  AU: ['Australie', '🇦🇺', EN_F, EN_L], NZ: ['Nouvelle-Zélande', '🇳🇿', EN_F, EN_L], CA: ['Canada', '🇨🇦', US_F, US_L],
  MX: ['Mexique', '🇲🇽', ES_F, AR_L], JM: ['Jamaïque', '🇯🇲', EN_F, EN_L], HN: ['Honduras', '🇭🇳', ES_F, AR_L],
  PA: ['Panama', '🇵🇦', ES_F, CO_L], PY: ['Paraguay', '🇵🇾', AR_F, AR_L], VE: ['Venezuela', '🇻🇪', ES_F, CO_L],
  CL: ['Chili', '🇨🇱', AR_F, AR_L], ZA: ['Afrique du Sud', '🇿🇦', NG_F, NG_L], TG: ['Togo', '🇹🇬', AF_F, CI_L],
};
export const CORE_NATIONS = Object.keys(NATIONS);
for (const [k, [name, flag, f, l]] of Object.entries(EXTRA)) NATIONS[k] = { name, flag, f, l };
export const NATION_CODES = Object.keys(NATIONS);

// Répartition des joueurs étrangers selon le pays du club
export const FOREIGN_MIX = {
  FR: { SN: 6, CI: 6, CM: 4, ML: 4, MA: 5, DZ: 5, TN: 2, BE: 4, PT: 3, BR: 4, AR: 2, ES: 2, IT: 1, DE: 1, NL: 1, CH: 2, GH: 2, NG: 2, HR: 1, DK: 1, US: 1, JP: 1, CO: 1, EN: 1 },
  EN: { FR: 4, ES: 3, PT: 4, BR: 4, AR: 3, NL: 4, BE: 4, DE: 2, IT: 1, SN: 2, CI: 2, NG: 3, GH: 3, MA: 1, DK: 3, NO: 2, SE: 2, HR: 1, RS: 1, US: 3, JP: 2, KR: 2, UY: 2, CO: 2, PL: 2, CH: 1, TR: 1, CM: 1 },
  ES: { AR: 6, BR: 5, UY: 4, CO: 3, PT: 4, FR: 4, MA: 4, DZ: 1, IT: 1, DE: 1, NL: 2, BE: 1, SN: 2, CI: 1, NG: 2, GH: 2, HR: 1, RS: 1, JP: 2, KR: 1, US: 1, EN: 1, TR: 1, CM: 1 },
  IT: { AR: 4, BR: 5, FR: 4, ES: 2, PT: 2, NL: 3, BE: 3, DE: 2, HR: 4, RS: 4, PL: 4, DK: 3, SE: 2, NO: 2, CH: 3, SN: 2, CI: 2, NG: 2, GH: 2, MA: 2, DZ: 1, TR: 2, UY: 2, CO: 2, US: 2, JP: 1, KR: 1, EN: 1 },
  DE: { FR: 4, CH: 5, NL: 4, BE: 3, DK: 4, SE: 2, NO: 2, PL: 3, HR: 3, RS: 2, TR: 5, US: 3, JP: 4, KR: 3, BR: 2, PT: 2, ES: 2, IT: 1, CI: 2, SN: 1, GH: 2, NG: 2, CM: 2, MA: 2, EN: 2, AR: 1, CO: 1 },
};
