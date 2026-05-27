export const SUBJECTS = ["Wszystkie", "Mikroekonomia", "Makroekonomia", "Ekonometria", "Statystyka", "Rachunkowość", "Finanse", "Zarządzanie"];

export const UNIVERSITIES = ["SGH w Warszawie", "UE w Krakowie", "UE we Wrocławiu", "Uniwersytet Warszawski", "Akademia Leona Koźmińskiego", "UE w Poznaniu"];

export const TUTORS_DATA = Array.from({ length: 25 }).map((_, i) => ({
    id: i + 1,
    name: ["Adam Nowak", "Katarzyna Kowalska", "Michał Wiśniewski", "Anna Wójcik", "Piotr Mazur", "Marta Kaczmarek", "Jakub Lewandowski", "Zofia Zielińska", "Łukasz Szymczak", "Magdalena Woźniak", "Tomasz Kozłowski", "Natalia Jankowska", "Paweł Wojciechowski", "Karolina Kwiatkowska", "Robert Kaczmarczyk", "Alicja Piotrowska", "Jan Grabowski", "Dominika Pawlak", "Krzysztof Michalski", "Monika Król", "Mateusz Wieczorek", "Patrycja Jabłońska", "Szymon Dudek", "Ewa Adamczyk", "Andrzej Majewski"][i],
    university: UNIVERSITIES[i % UNIVERSITIES.length],
    subject: SUBJECTS[1 + (i % (SUBJECTS.length - 1))],
    rating: (4.5 + Math.random() * 0.5).toFixed(1),
    price: (1.2 + Math.random() * 1.5).toFixed(2),
    reviews: Math.floor(Math.random() * 200),
    img: `https://i.pravatar.cc/150?img=${i + 10}`,
    bio: "Ekspert w swojej dziedzinie z wieloletnim doświadczeniem w nauczaniu studentów topowych uczelni ekonomicznych. Gwarantuję zrozumienie materiału w krótkim czasie."
}));
