/* Unit registry. Add a unit file, a script tag, and an id here. */
(function (root) {
  const ORDER = ['unit1'];
  root.BEAR_UNIT_ORDER = ORDER;
  if (typeof module !== 'undefined' && module.exports) module.exports = ORDER;
})(typeof globalThis !== 'undefined' ? globalThis : this);
