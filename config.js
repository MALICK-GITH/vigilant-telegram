// Fonctions sensibles déplacées ici
// Ce fichier peut être ajouté au .gitignore pour ne pas être publié

function getAdminPin() {
  // Changez ce PIN régulièrement
  return "6624";
}

function validateAdminAccess(pin) {
  return pin === getAdminPin();
}

// Vous pouvez ajouter d'autres fonctions sensibles ici
