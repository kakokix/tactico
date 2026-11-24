// Score manager pour le classement mondial (même calcul côté serveur).
import { SCORE_RULES as S } from './constants.js';

export function careerScore(c) {
  return S.win * (c.w | 0) + S.draw * (c.d | 0) + S.title1 * (c.titles1 | 0) + S.title2 * (c.titles2 | 0)
    + S.cup * (c.cups | 0) + S.conti * (c.conti | 0) + S.promo * (c.promos | 0) + S.objMet * (c.objMet | 0) + S.objEx * (c.objEx | 0);
}
export function trophyCount(c) {
  return (c.titles1 | 0) + (c.titles2 | 0) + (c.cups | 0) + (c.conti | 0);
}
