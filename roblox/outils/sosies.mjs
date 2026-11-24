// Personnages R6 qui rappellent les stars (coupe du catalogue Roblox, barbe, teint de 1 à 6).
// Format : 'Prénom Nom' (comme dans src/data/real) -> 'coupe/barbe/teint'. Barbe vide = sans barbe.
// Seulement les joueurs dont l'apparence est bien connue : les autres ont un look tiré au hasard.
// Dans le jeu, ces joueurs portent toujours un nom modifié.
export const SOSIES = {
  // Arsenal
  'David Raya': 'brunCourt/courte/2', 'William Saliba': 'buzz//6', 'Gabriel': 'buzz2/barbe/3', 'Jurriën Timber': 'buzz//5',
  'Ben White': 'brunCourt//1', 'Riccardo Calafiori': 'longsBruns/courte/2', 'Piero Hincapié': 'buzz//5', 'Ezri Konsa': 'buzz2//6',
  'Myles Lewis-Skelly': 'locks//5', 'Declan Rice': 'brunCoiffe//2', 'Martín Zubimendi': 'noirFrange/courte/2',
  'Bruno Guimarães': 'bouclesNoires/barbe/3', 'Martin Ødegaard': 'brunMeche//1', 'Mikel Merino': 'brunLisse/barbe/2',
  'Eberechi Eze': 'buzz//6', 'Kai Havertz': 'blondCourt//1', 'Bukayo Saka': 'buzz2//6', 'Noni Madueke': 'bouclesNoires//6',
  'Gabriel Martinelli': 'ondulesNoirs//2', 'Christos Tzolis': 'noirFrange//2', 'Viktor Gyökeres': 'brunCourt/barbe/2',
  // Real Madrid
  'Thibaut Courtois': 'brunCoiffe/courte/2', 'Trent Alexander-Arnold': 'buzz//3', 'Denzel Dumfries': 'buzz2//4',
  'Dani Carvajal': 'brunCourt/barbe/2', 'Éder Militão': 'buzz2//4', 'Antonio Rüdiger': 'buzz/barbe/6', 'Dean Huijsen': 'brunCourt//2',
  'Ibrahima Konaté': 'buzz2/barbe/6', 'Marc Cucurella': 'longsBoucles//2', 'Álvaro Carreras': 'noirFrange//2',
  'Aurélien Tchouaméni': 'buzz//6', 'Federico Valverde': 'brunLisse/barbe/2', 'Eduardo Camavinga': 'locks//6',
  'Bernardo Silva': 'noirFrange/courte/2', 'Jude Bellingham': 'ondulesNoirs//2', 'Arda Güler': 'brunStyle//2',
  'Rodrygo': 'bouclesNoires//4', 'Vinícius Júnior': 'twists//6', 'Kylian Mbappé': 'buzz2//5',
  // Manchester City
  'Gianluigi Donnarumma': 'brunCourt/courte/2', 'Rúben Dias': 'brunCourt/barbe/2', 'Joško Gvardiol': 'chignonNoir//2',
  'Marc Guéhi': 'buzz//6', 'Abdukodir Khusanov': 'noirFrange//2', 'Rayan Aït-Nouri': 'bouclesNoires//3',
  'Matheus Nunes': 'brunCourt/courte/3', 'Rico Lewis': 'ondulesNoirs//4', 'Enzo Fernández': 'brunStyle//2',
  'Elliot Anderson': 'brunCoiffe//1', 'Mateo Kovačić': 'noirArriere/barbe/2', 'Phil Foden': 'buzzBlond//1',
  'Rayan Cherki': 'bouclesNoires/courte/3', 'Jérémy Doku': 'buzz2//6', 'Antoine Semenyo': 'buzz//6', 'Iliman Ndiaye': 'locks//6',
  'Erling Haaland': 'chignonBlond//1',
  // Atlético de Madrid
  'Jan Oblak': 'brunCourt/barbe/1', 'Cristian Romero': 'noirFrange/barbe/3', 'José María Giménez': 'brunCourt/barbe/2',
  'Robin Le Normand': 'brunCoiffe//1', 'Dávid Hancko': 'noirFrange//1', 'Marcos Llorente': 'brunMeche//2',
  'Alejandro Grimaldo': 'noirArriere/courte/2', 'Koke': 'brunCourt/barbe/2', 'Pablo Barrios': 'noirFrange//2',
  'Morten Hjulmand': 'brunCourt/barbe/1', 'Conor Gallagher': 'brunCoiffe//1', 'Álex Baena': 'brunStyle//2',
  'Thiago Almada': 'brunLisse//2', 'Kang-in Lee': 'noirFrange//2', 'Giuliano Simeone': 'ondulesNoirs//2',
  'Julián Álvarez': 'noirFrange//2', 'Alexander Sørloth': 'blondCourt/courte/1',
  // FC Barcelone
  'Joan García': 'brunCourt//2', 'Wojciech Szczęsny': 'brunCoiffe/barbe/1', 'Jules Koundé': 'afro//6',
  'João Cancelo': 'noirFrange/barbe/3', 'Pau Cubarsí': 'brunCoiffe//2', 'Eric García': 'noirFrange//2', 'Alejandro Balde': 'bouclesNoires//6',
  'Rodri': 'brunCoiffe/barbe/2', 'Frenkie de Jong': 'desordre//1', 'Pedri': 'brunStyle//2', 'Gavi': 'brunLisse//2',
  'Dani Olmo': 'brunCourt/courte/2', 'Fermín López': 'bouclesBrunes//2', 'Lamine Yamal': 'twists//4', 'Raphinha': 'ondulesNoirs/courte/3',
  'Anthony Gordon': 'brunCourt//1', 'Karim Adeyemi': 'buzzBlond//4',
  // Paris SG
  'Lucas Chevalier': 'brunCourt//1', 'Matvey Safonov': 'brunCoiffe//1', 'Achraf Hakimi': 'buzz2//3', 'Marquinhos': 'brunCourt/barbe/2',
  'Willian Pacho': 'buzz//6', 'Illia Zabarnyi': 'brunCoiffe//1', 'Nuno Mendes': 'locks//5', 'Lucas Hernandez': 'brunCourt/courte/2',
  'Vitinha': 'brunLisse/courte/2', 'João Neves': 'desordre//2', 'Fabián Ruiz': 'noirArriere/barbe/2', 'Warren Zaïre-Emery': 'bouclesNoires//6',
  'Désiré Doué': 'locks//6', 'Ousmane Dembélé': 'buzz/courte/6', 'Khvicha Kvaratskhelia': 'brunLisse//2', 'Ferran Torres': 'noirFrange//2',
  // Bayern
  'Manuel Neuer': 'blondCourt//1', 'Dayot Upamecano': 'buzz//6', 'Jonathan Tah': 'buzz2/barbe/5', 'Min-jae Kim': 'noirFrange//2',
  'Josip Stanišić': 'brunCourt//1', 'Konrad Laimer': 'brunCoiffe//1', 'Alphonso Davies': 'buzz2//6', 'Joshua Kimmich': 'brunMeche//1',
  'Aleksandar Pavlović': 'brunCourt//1', 'Jamal Musiala': 'bouclesNoires//4', 'Michael Olise': 'locks//5', 'Serge Gnabry': 'buzz/barbe/4',
  'Luis Díaz': 'afro//4', 'Harry Kane': 'brunCoiffe//1',
  // Liverpool
  'Alisson': 'brunCoiffe/barbe/2', 'Giorgi Mamardashvili': 'brunCourt//1', 'Virgil van Dijk': 'noirArriere/barbe/4',
  'Ronald Araújo': 'buzz/barbe/5', 'Jeremie Frimpong': 'twists//5', 'Milos Kerkez': 'brunLisse//1', 'Ryan Gravenberch': 'locks//5',
  'Alexis Mac Allister': 'bouclesBrunes//2', 'Dominik Szoboszlai': 'blondCourt//1', 'Florian Wirtz': 'brunCoiffe//1',
  'Bradley Barcola': 'locks//6', 'Cody Gakpo': 'buzz2//5', 'Hugo Ekitike': 'bouclesNoires//6', 'Alexander Isak': 'ondulesNoirs//5',
  // Tottenham
  'Guglielmo Vicario': 'brunCourt/courte/2', 'Micky van de Ven': 'brunCoiffe//1', 'Jan Paul van Hecke': 'buzz//5',
  'Pedro Porro': 'noirFrange/courte/2', 'Destiny Udogie': 'locks//5', 'Andy Robertson': 'brunCoiffe/courte/1',
  'Sandro Tonali': 'longsBruns/courte/2', 'Mateus Fernandes': 'noirFrange//2', 'James Maddison': 'brunStyle//1',
  'Xavi Simons': 'longsBoucles//4', 'Dejan Kulusevski': 'brunCourt//1', 'Mohammed Kudus': 'twists//6', 'Savinho': 'ondulesNoirs//3',
  'Omar Marmoush': 'noirFrange/barbe/3', 'Dominic Solanke': 'buzz//6',
  // Manchester United
  'Matthijs de Ligt': 'blondCourt//1', 'Lisandro Martínez': 'brunCourt/barbe/2', 'Leny Yoro': 'buzz//6', 'Diogo Dalot': 'chignonNoir//2',
  'Carlos Baleba': 'locks//6', 'Youri Tielemans': 'brunCoiffe/courte/1', 'Bruno Fernandes': 'brunCourt/courte/2',
  'Matheus Cunha': 'bouclesNoires/barbe/3', 'Amad Diallo': 'twists//6', 'Bryan Mbeumo': 'locks//6', 'Marcus Rashford': 'buzz2//5',
  'Benjamin Šeško': 'brunCourt//1',
  // Inter
  'Yann Sommer': 'brunMeche//1', 'Alessandro Bastoni': 'noirFrange//2', 'Manuel Akanji': 'buzz/courte/4', 'John Stones': 'brunCoiffe//1',
  'Yann Bisseck': 'buzz//5', 'Federico Dimarco': 'brunCourt//2', 'Hakan Çalhanoğlu': 'noirFrange/barbe/2', 'Nicolò Barella': 'brunMeche//2',
  'Davide Frattesi': 'brunStyle//2', 'Piotr Zieliński': 'brunCoiffe//1', 'Curtis Jones': 'ondulesNoirs//4',
  'Lautaro Martínez': 'noirArriere/barbe/2', 'Marcus Thuram': 'locks//5',
  // Chelsea
  'Emiliano Martínez': 'brunCourt/barbe/2', 'Reece James': 'buzz//5', 'Malo Gusto': 'buzz2//5', 'Wesley Fofana': 'locks//6',
  'Levi Colwill': 'bouclesNoires//4', 'Maxence Lacroix': 'buzz//5', 'Moisés Caicedo': 'buzz2//5', 'Cole Palmer': 'brunCourt//1',
  'Morgan Rogers': 'buzz//5', 'Pedro Neto': 'noirFrange//2', 'Estêvão': 'ondulesNoirs//3', 'João Pedro': 'noirFrange//4',
  // Naples
  'Alex Meret': 'brunCourt//1', 'Vanja Milinković-Savić': 'brunCourt/barbe/1', 'Giovanni Di Lorenzo': 'brunCoiffe/courte/2',
  'Amir Rrahmani': 'brunCourt/barbe/2', 'Alessandro Buongiorno': 'noirFrange//2', 'Sam Beukema': 'brunCoiffe//1',
  'Stanislav Lobotka': 'brunCourt//1', 'Frank Anguissa': 'buzz//6', 'Scott McTominay': 'brunCoiffe//1',
  'Kevin De Bruyne': 'roux//1', 'Rasmus Højlund': 'blondCourt//1', 'Romelu Lukaku': 'buzz/barbe/6',
  // Aston Villa
  'Pau Torres': 'noirFrange//2', 'Matty Cash': 'brunCourt//1', 'Boubacar Kamara': 'buzz//5', 'Amadou Onana': 'locks//6',
  'João Gomes': 'noirFrange//3', 'Leon Goretzka': 'brunCoiffe/barbe/1', 'John McGinn': 'brunCourt//1',
  'Alejandro Garnacho': 'chignonNoir//2', 'Nicolas Jackson': 'locks//6',
  // Juventus
  'Michele Di Gregorio': 'brunCourt/barbe/2', 'Bremer': 'buzz//5', 'Pierre Kalulu': 'buzz2//5', 'Andrea Cambiaso': 'noirFrange//2',
  'Manuel Locatelli': 'brunCoiffe/barbe/2', 'Khéphren Thuram': 'locks//5', 'Teun Koopmeiners': 'brunMeche//1',
  'Kenan Yıldız': 'noirFrange//2', 'Francisco Conceição': 'ondulesNoirs//2', 'Jonathan David': 'buzz//6',
  // Newcastle
  'Nick Pope': 'brunCourt//1', 'Tino Livramento': 'buzz//5', 'Sven Botman': 'brunCoiffe//1', 'Malick Thiaw': 'buzz2//5',
  'Lewis Hall': 'brunCourt//1', 'Joelinton': 'bouclesNoires//4', 'Nico González': 'noirFrange//2', 'Yoane Wissa': 'buzz//6',
  // Nottingham Forest
  'Matz Sels': 'brunCourt//1', 'Nikola Milenković': 'brunCourt/barbe/1', 'Ousmane Diomande': 'buzz//6',
  'Daniel Muñoz': 'noirFrange/barbe/3', 'Xaver Schlager': 'brunCoiffe//1', 'Morgan Gibbs-White': 'locks//4', 'Dan Ndoye': 'buzz//5',
  // Milan
  'Mike Maignan': 'buzz/barbe/6', 'Fikayo Tomori': 'buzz2//5', 'Strahinja Pavlović': 'brunCourt/barbe/1', 'Adrien Rabiot': 'longsBruns//1',
  'Christian Pulisic': 'brunCoiffe//1', 'Rafael Leão': 'twists//5', 'Gonçalo Ramos': 'noirFrange//2',
  // Lazio, Rome
  'Ivan Provedel': 'brunCourt//2', 'Mario Gila': 'noirFrange//2', 'Alessio Romagnoli': 'brunCourt/barbe/2', 'Nicolò Rovella': 'brunCoiffe//2',
  'Matteo Guendouzi': 'afro//3', 'Mattia Zaccagni': 'brunCourt/courte/2',
  'Mile Svilar': 'brunCourt//1', 'Gianluca Mancini': 'brunCourt/barbe/2', 'Evan Ndicka': 'buzz//6', 'Manu Koné': 'locks//6',
  'Matías Soulé': 'noirFrange//2', 'Donyell Malen': 'buzz2//5',
  // Dortmund, Leverkusen, Leipzig, Francfort, Stuttgart, Fribourg, Hoffenheim
  'Gregor Kobel': 'brunCoiffe//1', 'Nico Schlotterbeck': 'brunCourt//1', 'Waldemar Anton': 'brunCourt//1', 'Felix Nmecha': 'buzz//5',
  'Maximilian Beier': 'brunCoiffe//1', 'Serhou Guirassy': 'locks//6',
  'Edmond Tapsoba': 'buzz//6', 'Jarell Quansah': 'buzz2//4', 'Aleix García': 'noirFrange//2', 'Malik Tillman': 'buzz//4', 'Patrik Schick': 'brunCourt//1',
  'Willi Orbán': 'brunCourt/barbe/1', 'Castello Lukeba': 'buzz//5', 'David Raum': 'blondCourt//1', 'Christopher Nkunku': 'buzz2//5',
  'Arthur Theate': 'brunCourt//1', 'Robin Koch': 'blondCourt//1', 'Can Uzun': 'noirFrange//2', 'Jonathan Burkardt': 'brunCoiffe//1',
  'Angelo Stiller': 'brunCoiffe//1', 'Deniz Undav': 'brunCourt/barbe/2', 'Ermedin Demirović': 'noirFrange/barbe/2',
  'Noah Atubolu': 'buzz//5', 'Oliver Baumann': 'brunCourt//1',
  // Liga
  'Unai Simón': 'brunCourt/barbe/2', 'Dani Vivian': 'noirFrange//2', 'Oihan Sancet': 'brunCoiffe//2', 'Nico Williams': 'twists//6',
  'Iñaki Williams': 'buzz//6', 'Álex Remiro': 'brunCourt//2', 'Igor Zubeldia': 'noirFrange//2', 'Brais Méndez': 'brunCourt/barbe/2',
  'Takefusa Kubo': 'noirFrange//2', 'Mikel Oyarzabal': 'brunCoiffe//2', 'Giovani Lo Celso': 'brunCourt/barbe/2', 'Isco': 'noirFrange/barbe/2',
  'Abde Ezzalzouli': 'buzz2//3', 'Antony': 'bouclesNoires//4', 'Juan Foyth': 'brunCourt//2', 'Thomas Partey': 'buzz/barbe/6',
  'Alberto Moleiro': 'noirFrange//2', 'Georges Mikautadze': 'brunCoiffe/courte/2', 'David Soria': 'brunCourt/barbe/2',
  'Ante Budimir': 'brunCourt/barbe/1', 'Javi Guerra': 'noirFrange//2',
  // Serie A
  'Marco Carnesecchi': 'brunCourt//2', 'Giorgio Scalvini': 'brunCoiffe//1', 'Charles De Ketelaere': 'blondCourt//1', 'Ademola Lookman': 'twists//6',
  'Łukasz Skorupski': 'brunCourt//1', 'Jhon Lucumí': 'buzz//6', 'Lewis Ferguson': 'brunCoiffe//1', 'Riccardo Orsolini': 'brunStyle//2',
  'David de Gea': 'brunCourt/barbe/1', 'Albert Guðmundsson': 'blondCourt//1', 'Moise Kean': 'twists//6',
  'Trevoh Chalobah': 'buzz//6', 'Nico Paz': 'noirFrange//2',
  // Premier League et Ligue 1
  'Benjamin Pavard': 'bouclesBrunes//1', 'Pierre-Emile Højbjerg': 'brunCourt/courte/1', 'Mason Greenwood': 'twists//5', 'Amine Gouiri': 'noirFrange/courte/3',
  'Denis Zakaria': 'locks//5', 'Maghnes Akliouche': 'ondulesNoirs//3', 'Folarin Balogun': 'buzz2//6',
  'Đorđe Petrović': 'brunCourt//1', 'António Silva': 'noirFrange//2', 'Tyler Adams': 'buzz//4', 'Justin Kluivert': 'locks//5',
  'Dean Henderson': 'brunCourt//1', 'Adam Wharton': 'brunCoiffe//1', 'Ismaïla Sarr': 'buzz//6', 'Jean-Philippe Mateta': 'locks//6',
  'Caoimhín Kelleher': 'brunCourt//1', 'Mikkel Damsgaard': 'brunMeche//1', 'Bart Verbruggen': 'blondCourt//1',
  'Ferdi Kadıoğlu': 'noirFrange//2', 'Kaoru Mitoma': 'noirFrange//2', 'Jordan Pickford': 'blondCourt//1', 'Jarrad Branthwaite': 'brunCourt//1',
  'Bernd Leno': 'brunCourt/courte/1', 'Antonee Robinson': 'buzz//4', 'Hákon Arnar Haraldsson': 'blondCourt//1', 'Brice Samba': 'buzz//6',
  'James Trafford': 'brunCourt//1', 'Granit Xhaka': 'brunCourt/barbe/2', 'Jarrod Bowen': 'brunCoiffe//1',
};
