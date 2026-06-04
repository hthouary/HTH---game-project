// Test de fumée : simule une première édition réaliste et vérifie la cohérence.
import { buildInitialArtists, TOTAL_ARTISTS } from '../src/data/artists';
import { SPONSORS } from '../src/data/sponsors';
import { INFRASTRUCTURES } from '../src/data/infrastructures';
import { projectEdition, runSimulation } from '../src/engine/simulation';
import { aggregateLineup } from '../src/engine/economy';
import type { EditionPlan, Festival } from '../src/types';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('❌ ÉCHEC:', msg);
    process.exitCode = 1;
  } else {
    console.log('✓', msg);
  }
}
const isNum = (n: number) => typeof n === 'number' && Number.isFinite(n);

const artists = buildInitialArtists();
assert(artists.length >= 100, `Catalogue d'au moins 100 artistes (${TOTAL_ARTISTS})`);
assert(artists.every((a) => isNum(a.cost) && a.cost >= 2500), 'Tous les cachets sont finis et >= 2500');
assert(artists.every((a) => a.popularity >= 5 && a.popularity <= 99), 'Popularités dans [5,99]');

const festival: Festival = { name: 'Vibrasson', style: 'EDM', location: 'Bord de mer' };
const budget = 250000;

// Sélection : artistes de palier 1 abordables
const tier1 = artists.filter((a) => a.tier === 1).sort((a, b) => a.cost - b.cost);
const booked: string[] = [];
let spent = 0;
for (const a of tier1) {
  if (spent + a.cost > 120000) continue;
  booked.push(a.id);
  spent += a.cost;
  if (booked.length >= 6) break;
}

const infrastructures: Record<string, number> = {};
const add = (id: string, q: number) => {
  if (INFRASTRUCTURES.find((o) => o.id === id)) infrastructures[id] = q;
};
add('stage_small', 1);
add('toilets_comfort', 1);
add('bar_mobile', 2);
add('food_truck', 2);
add('security_std', 1);
add('staff_volunteer', 1);

const sponsor = SPONSORS.find((s) => s.minReputation === 0)!;

const plan: EditionPlan = {
  bookedArtistIds: booked,
  infrastructures,
  marketing: { units: { Instagram: 2, TikTok: 2 } },
  acceptedSponsorIds: [sponsor.id],
  ticketPrice: 45,
};

const lineup = aggregateLineup(plan.bookedArtistIds, artists, festival.style);
assert(lineup.count === booked.length, `Line-up agrégé (${lineup.count} artistes)`);
assert(isNum(lineup.drawPower) && lineup.drawPower > 0, 'Pouvoir d\'attraction valide');

const projection = projectEdition({
  festival, edition: 1, budget, reputation: 63, popularity: 8,
  artists, sponsors: [sponsor], plan, weather: 'Grand soleil',
});
console.log('\n— Projection —');
console.log(projection);
assert(isNum(projection.expectedAttendance) && projection.expectedAttendance > 0, 'Affluence projetée > 0');
assert(projection.expectedAttendance <= projection.capacity, 'Affluence <= capacité');
assert(isNum(projection.expectedProfit), 'Bénéfice projeté fini');
assert(projection.satisfaction >= 0 && projection.satisfaction <= 100, 'Satisfaction dans [0,100]');

const result = runSimulation({
  festival, edition: 1, budget, reputation: 63, popularity: 8,
  artists, sponsors: [sponsor], plan, weather: 'Grand soleil', eventChoices: [],
});
const r = result.report;
console.log('\n— Rapport édition 1 —');
console.log('Affluence:', r.attendance, '/', r.capacity);
console.log('Recettes:', r.revenue);
console.log('Dépenses:', r.expenses);
console.log('Bénéfice:', r.profit);
console.log('Satisfaction:', r.satisfaction);
console.log('Réputation:', r.reputationBefore, '→', r.reputationAfter, `(${r.reputationDelta})`);
console.log('Avis générés:', r.reviews.length);
console.log('Têtes d\'affiche:', r.headliners);

assert(isNum(r.profit), 'Bénéfice fini');
assert(isNum(r.revenue.total) && r.revenue.total > 0, 'Recettes totales > 0');
assert(r.reviews.length >= 1, 'Au moins un avis généré');
assert(isNum(result.reputationAfter) && result.reputationAfter >= 0, 'Réputation après finie et >= 0');
assert(isNum(result.budgetAfter), 'Budget après fini');
assert(r.satisfaction.global >= 0 && r.satisfaction.global <= 100, 'Note globale dans [0,100]');

console.log('\n✅ Test de fumée terminé.');
