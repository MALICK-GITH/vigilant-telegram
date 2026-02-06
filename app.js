// app.js — lib commune (site statique)
// Règle : si localStorage.tournamentData existe -> utiliser
// sinon -> fetch /data.json avec anti-cache

const LS_KEY = "tournamentData";

export function roundsOrder(){
  return ["R32","R16","QF","SF","F"];
}

export async function loadData(){
  // 1) localStorage prioritaire
  const local = localStorage.getItem(LS_KEY);
  if(local){
    try{
      return JSON.parse(local);
    }catch(e){
      // si local corrompu -> reset
      localStorage.removeItem(LS_KEY);
    }
  }

  // 2) sinon data.json
  const url = "/data.json?ts=" + Date.now();
  const res = await fetch(url, {cache:"no-store"});
  if(!res.ok) throw new Error("Impossible de charger data.json : " + res.status);
  const data = await res.json();
  normalizeData(data);
  return data;
}

export function saveData(data){
  normalizeData(data);
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function resetData(){
  localStorage.removeItem(LS_KEY);
}

export function normalizeData(data){
  if(!data.players) data.players = [];
  if(!data.matches) data.matches = [];
  if(!data.history) data.history = [];
  if(!data.config) data.config = {
    tournamentName: "LES ÉLITES EFOOTPRO",
    mode: "Élimination directe",
    rules: []
  };
}

export function getPlayerById(data, id){
  return (data.players||[]).find(p=>p.id===id) || null;
}

export function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function statusTag(status){
  const st = status || "EN_ATTENTE";
  if(st==="QUALIFIE") return `<span class="tag q">🟢 QUALIFIÉ</span>`;
  if(st==="ELIMINE") return `<span class="tag e">🔴 ÉLIMINÉ</span>`;
  return `<span class="tag a">🟠 EN ATTENTE</span>`;
}

export function currentRound(data){
  // round actuel = premier round qui a au moins un match A_JOUER
  for(const r of roundsOrder()){
    const ms = (data.matches||[]).filter(m=>m.round===r);
    if(ms.length && ms.some(m=>m.status!=="TERMINE")) return r;
  }
  // sinon dernier
  return "F";
}

export function validateMatch(data, matchId, scoreA, scoreB, proofUrl, admin){
  const m = (data.matches||[]).find(x=>x.id===matchId);
  if(!m) throw new Error("Match introuvable: " + matchId);

  const a = getPlayerById(data, m.aId);
  const b = getPlayerById(data, m.bId);
  if(!a || !b) throw new Error("Joueur introuvable (aId/bId).");

  const sa = Number(scoreA);
  const sb = Number(scoreB);
  if(!Number.isFinite(sa) || !Number.isFinite(sb)) throw new Error("Score invalide.");
  if(sa===sb) throw new Error("Égalité interdite en élimination directe.");

  // preuve (optionnel mais conseillé)
  if(proofUrl && !/\.(png|jpg|jpeg|webp)(\?.*)?$/i.test(proofUrl)){
    throw new Error("proofUrl doit être un lien image direct (.png/.jpg/.webp).");
  }

  m.scoreA = sa;
  m.scoreB = sb;
  m.status = "TERMINE";
  m.proofUrl = proofUrl || m.proofUrl || "";
  m.playedAt = new Date().toISOString();
  m.validatedBy = admin || "Admin";

  const winnerId = sa > sb ? m.aId : m.bId;
  const loserId  = sa > sb ? m.bId : m.aId;
  m.winnerId = winnerId;
  m.loserId = loserId;

  // Mise à jour statuts joueurs
  const w = getPlayerById(data, winnerId);
  const l = getPlayerById(data, loserId);
  if(w) w.status = "QUALIFIE";
  if(l) l.status = "ELIMINE";

  // Historique
  if(!data.history) data.history = [];
  data.history.unshift({
    ts: new Date().toISOString(),
    type: "MATCH_VALIDATE",
    actor: admin || "Admin",
    message: `Match ${m.id} validé: ${a.name} ${sa}-${sb} ${b.name}.`
  });

  return m;
}

export function generateNextRound(data, fromR, toR, admin){
  const ms = (data.matches||[]).filter(m=>m.round===fromR);
  if(!ms.length) throw new Error("Aucun match dans " + fromR);
  if(ms.some(m=>m.status!=="TERMINE")) throw new Error("Tous les matchs de "+fromR+" doivent être TERMINÉ.");

  const winners = ms.map(m=>m.winnerId).filter(Boolean);
  if(winners.length % 2 !== 0) throw new Error("Nombre de gagnants impair, impossible de générer.");

  // éviter doublon : si toR existe déjà
  const exists = (data.matches||[]).some(m=>m.round===toR);
  if(exists) throw new Error("Le round "+toR+" existe déjà (évite doublons).");

  const created = [];
  let idx = (data.matches||[]).length + 1;

  for(let i=0;i<winners.length;i+=2){
    created.push({
      id: "m" + String(idx++).padStart(2,"0"),
      round: toR,
      aId: winners[i],
      bId: winners[i+1],
      status: "A_JOUER"
    });
  }

  data.matches.push(...created);

  data.history.unshift({
    ts: new Date().toISOString(),
    type: "ROUND_GENERATE",
    actor: admin || "Admin",
    message: `Round ${toR} généré depuis ${fromR} (${created.length} matchs).`
  });

  return created;
}

// Nouvelles fonctions utilitaires
export function countPlayers(data){
  const ps = data.players||[];
  const q = ps.filter(p=>p.status==="QUALIFIE").length;
  const e = ps.filter(p=>p.status==="ELIMINE").length;
  const a = ps.filter(p=>p.status!=="QUALIFIE" && p.status!=="ELIMINE").length;
  return {q,e,a,total:ps.length};
}

export function countMatches(data){
  const ms = data.matches||[];
  const t = ms.filter(m=>m.status==="TERMINE").length;
  const aj = ms.filter(m=>m.status!=="TERMINE").length;
  return {t,aj,total:ms.length};
}

export function getRounds(data){
  const set = new Set((data.matches||[]).map(m=>m.round).filter(Boolean));
  const order = ["R32","R16","QF","SF","F"];
  const arr = [...set].sort((a,b)=>order.indexOf(a)-order.indexOf(b));
  return arr.length ? arr : ["R32"];
}

export function generateNextRoundFromCurrent(data, adminName){
  const order = ["R32","R16","QF","SF","F"];
  let currentRound = null;
  let nextRound = null;
  
  // Trouver le round actuel (premier avec des matchs non terminés)
  for(let i = 0; i < order.length; i++){
    const round = order[i];
    const matches = (data.matches||[]).filter(m=>m.round===round);
    if(matches.length > 0){
      if(matches.some(m=>m.status!=="TERMINE")){
        currentRound = round;
        nextRound = order[i+1];
        break;
      } else if(i < order.length - 1){
        // Tous les matchs sont terminés, on peut générer le suivant
        currentRound = round;
        nextRound = order[i+1];
        break;
      }
    }
  }
  
  if(!currentRound){
    throw new Error("Aucun round trouvé");
  }
  
  if(!nextRound){
    return { message: "Tournoi terminé !", created: [] };
  }
  
  // Vérifier que tous les matchs du round actuel sont terminés
  const currentMatches = (data.matches||[]).filter(m=>m.round===currentRound);
  if(currentMatches.some(m=>m.status!=="TERMINE")){
    throw new Error(`Tous les matchs du ${currentRound} doivent être terminés`);
  }
  
  // Vérifier que le prochain round n'existe pas déjà
  const existingNext = (data.matches||[]).some(m=>m.round===nextRound);
  if(existingNext){
    throw new Error(`Le round ${nextRound} existe déjà`);
  }
  
  // Générer les gagnants
  const winners = currentMatches.map(m=>m.winnerId).filter(Boolean);
  if(winners.length % 2 !== 0){
    throw new Error(`Nombre de gagnants impair : ${winners.length}`);
  }
  
  // Créer les matchs du round suivant
  const created = [];
  let idx = (data.matches||[]).length + 1;
  
  for(let i = 0; i < winners.length; i += 2){
    created.push({
      id: "m" + String(idx++).padStart(2,"0"),
      round: nextRound,
      aId: winners[i],
      bId: winners[i+1],
      status: "A_JOUER"
    });
  }
  
  data.matches.push(...created);
  
  // Historique
  data.history.unshift({
    ts: new Date().toISOString(),
    type: "ROUND_GENERATE",
    actor: adminName || "Admin",
    message: `Round ${nextRound} généré depuis ${currentRound} (${created.length} matchs).`
  });
  
  return { 
    message: `${created.length} matchs générés pour le round ${nextRound}`, 
    created,
    currentRound,
    nextRound
  };
}