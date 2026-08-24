/* ==========================================================================
   Deck contents, from docs/deck-plan.md.

   Each entry is tagged with the zone it occupies rather than an exact
   coordinate — the deck plan is written in fore / mid / aft terms and the
   renders do not support finer placement than that, so pinning to a specific
   compartment would be inventing precision the source does not have.
   ========================================================================== */

export const ZONE_U = { fwd: 0.80, mid: 0.52, aft: 0.18 };

export const DECKS = [
  { n: 1, name: 'Dorsal Equipment Space',
    note: 'Uninhabitable · 1.9 m · pressurised, unheated · exceeds 340 K on a sustained Cold Run',
    items: [
      { zone: 'fwd', label: 'SENSOR DOME', lines: ['Retractable, armoured', 'Seals flush for Cold Run'] },
      { zone: 'mid', label: 'SHIELD GRID', lines: ['Upper metaphasic emitters'] },
      { zone: 'mid', label: 'SIF NODES', lines: ['Cluster A — armour matrix'] },
      { zone: 'aft', label: 'RADIATOR ROOTS', lines: ['Dorsal vane roots', 'Explosive decoupling bolts'] }
    ] },

  { n: 2, name: 'Command',
    note: 'No viewports on this class — the CIC aperture is the only transparency in the hull',
    items: [
      { zone: 'mid', label: 'ARMOURED CIC', lines: ['Sunken bridge module', '"Cicada" blast shutters, 1.2 s seal'] },
      { zone: 'mid', label: 'READY ROOM', lines: ['Captain’s quarters adjoining'] },
      { zone: 'fwd', label: 'HOLO-TANK', lines: ['Tactical planning room'] },
      { zone: 'aft', label: 'DORSAL DOCKING PORT', lines: ['Personnel airlock', 'Primary crew ingress'] }
    ] },

  { n: 3, name: 'Senior Officers / Upper Aft Machinery',
    items: [
      { zone: 'fwd', label: 'SENIOR QUARTERS', lines: ['Officer’s mess · XO’s office'] },
      { zone: 'mid', label: 'TURBOLIFT JUNCTION', lines: ['Upper computer core access'] },
      { zone: 'aft', label: 'AID VENTING GALLERY', lines: ['Plasma venting control', 'Radiator coolant pumps'] },
      { zone: 'aft', label: 'PROBE SILOS', lines: ['"Flash-Evac" — upper maintenance'] }
    ] },

  { n: 4, name: 'Medical / Armory / Engineering Overlook',
    items: [
      { zone: 'fwd', label: 'SICKBAY', lines: ['12 biobeds · two wards · surgical suite',
                                               'EMH Mk IV core · four-drawer morgue'] },
      { zone: 'fwd', label: 'TRANSPORTER 5', lines: ['Casualty beam-in, sickbay adjacent'] },
      { zone: 'mid', label: 'MAIN ARMORY', lines: ['CQC holo-simulator · EVA lockers'] },
      { zone: 'aft', label: 'ENGINEERING OVERLOOK', lines: ['Matter injector heads, Cores A and B'] },
      { zone: 'aft', label: 'EPS CAPACITORS', lines: ['AID bank, upper tier', 'Aft of bulkhead 4-ALPHA'] }
    ] },

  { n: 5, name: 'Habitation / Engineering Control',
    items: [
      { zone: 'fwd', label: 'ENLISTED QUARTERS', lines: ['Private rooms, oversized by fleet standard'] },
      { zone: 'fwd', label: '"THE CONSTELLATION ROOM"', lines: ['Crew lounge', 'Plaque from the original NCC-9754'] },
      { zone: 'mid', label: 'HOLODECKS 1 & 2', lines: ['Hardened emitters'] },
      { zone: 'aft', label: 'MAIN ENGINEERING', lines: ['Upper level · primary control',
                                                        'Chief Engineer’s office'] },
      { zone: 'aft', label: 'CONSTRICTION COILS', lines: ['AID magnetic assembly'] }
    ] },

  { n: 6, name: 'Crew Support / Core Centerline',
    items: [
      { zone: 'fwd', label: 'MESS & GALLEY', lines: ['Enlisted quarters · recycling'] },
      { zone: 'mid', label: 'TRANSPORTERS 1 & 2', lines: ['Six-pad, rapid cycle', 'Cargo transporter 1'] },
      { zone: 'mid', label: 'SECONDARY COMMAND', lines: ['Armoured, self-contained',
                                                         'Flies and fights if the CIC is lost'] },
      { zone: 'aft', label: 'CORE CENTERLINE', lines: ['Plasma transfer conduits',
                                                       'Subspace displacement manifold'] },
      { zone: 'aft', label: 'PROBE LAUNCHERS', lines: ['"Flash-Evac" mesh transceivers'] }
    ] },

  { n: 7, name: 'Engineering Floor / Computer / Cloak',
    items: [
      { zone: 'fwd', label: 'TORPEDO MAGAZINE', lines: ['Upper · rotary feed A'] },
      { zone: 'mid', label: 'COMPUTER CORE', lines: ['Upper level', 'Isolinear / bio-neural gel galleries'] },
      { zone: 'mid', label: 'CLOAK GENERATOR', lines: ['Mark-II "Alliance" — "the Icebox"',
                                                       'Thermally isolated · CO authorization'] },
      { zone: 'aft', label: 'ENGINEERING FLOOR', lines: ['Antimatter injection relays',
                                                         'Core ejection track, aft blowout doors'] }
    ] },

  { n: 8, name: 'Security / Primary Forward Weapons',
    items: [
      { zone: 'fwd', label: 'PULSE CANNONS', lines: ['4× Class-X · pre-fire chambers',
                                                     'Direct EPS taps into the nose notch'] },
      { zone: 'mid', label: 'COMPUTER CORE', lines: ['Lower level · ESH sub-processors'] },
      { zone: 'mid', label: 'SECURITY CENTRE', lines: ['Brig, four cells · ESH muster points'] },
      { zone: 'aft', label: 'CONDUIT GALLERY', lines: ['Engineering subfloor'] }
    ] },

  { n: 9, name: 'Heavy Ordnance',
    note: 'There is no way to rearm this ship underway',
    items: [
      { zone: 'fwd', label: 'FORWARD LAUNCHERS', lines: ['2× rapid-fire quantum', 'Rotary autoloaders'] },
      { zone: 'mid', label: 'MAIN MAGAZINE', lines: ['250 quantum · 100 photon'] },
      { zone: 'mid', label: 'ORDNANCE TRUNK', lines: ['Mates to a starbase or tender arm',
                                                      'Six-hour evolution, ship cold'] },
      { zone: 'mid', label: 'CARGO BAY 1', lines: ['Ground-assault munitions'] },
      { zone: 'aft', label: 'AFT LAUNCHER', lines: ['Aft magazine'] }
    ] },

  { n: 10, name: 'Deflector / Interdiction / Stores',
    items: [
      { zone: 'fwd', label: 'MAIN DEFLECTOR', lines: ['Upper level'] },
      { zone: 'fwd', label: 'SUBSPACE PULSE EMITTER', lines: ['Primary array', 'Deflector power shunts'] },
      { zone: 'mid', label: 'CARGO BAY 2', lines: ['90-day consumables · general stores'] },
      { zone: 'mid', label: 'VENTRAL AIRLOCK', lines: ['Cargo transporter 2', 'Docking port'] },
      { zone: 'aft', label: 'DEUTERIUM BUNKERAGE', lines: ['Upper'] }
    ] },

  { n: 11, name: 'Auxiliary Power / Fuel',
    items: [
      { zone: 'fwd', label: 'MAIN DEFLECTOR', lines: ['Lower level'] },
      { zone: 'mid', label: 'FUSION REACTORS', lines: ['4× auxiliary',
                                                       'Dedicated to shield and weapon redundancy'] },
      { zone: 'aft', label: 'FUEL & ANTIMATTER', lines: ['Primary deuterium tankage',
                                                         'Antimatter pods, upper tier'] }
    ] },

  { n: 12, name: 'Ventral Sensors / Transport / Antimatter',
    note: 'Lowest deck served by turbolift',
    items: [
      { zone: 'fwd', label: 'VENTRAL SENSORS', lines: ['Targeting scanners'] },
      { zone: 'mid', label: 'TRANSPORTERS 3 & 4', lines: [] },
      { zone: 'mid', label: 'SHIELD GENERATORS', lines: ['Ventral metaphasic'] },
      { zone: 'aft', label: 'ANTIMATTER PODS', lines: ['Lower tier', 'Emergency ejection rails'] }
    ] },

  { n: 13, name: 'Thermal & Structural Management',
    note: 'Passes 350 K within forty minutes of a hot Cold Run — suited access, buddy system, hard time limits',
    items: [
      { zone: 'fwd', label: 'LIFE SUPPORT', lines: ['Main atmospheric processing'] },
      { zone: 'mid', label: 'SIF GENERATORS', lines: ['Primary, tuned for the 18 cm matrix'] },
      { zone: 'mid', label: 'HELIUM RESERVOIRS', lines: ['Heavy-duty coolant pumps',
                                                         'Feed the flush-deck radiator vanes'] },
      { zone: 'aft', label: 'HEAT-SINK BANKS', lines: ['Chemical sinks absorbing waste heat under cloak',
                                                       'Their capacity IS the cloak’s duration limit'] }
    ] },

  { n: 14, name: 'Ventral Equipment Space',
    note: 'Uninhabitable · 1.9 m',
    items: [
      { zone: 'fwd', label: 'TRACTOR EMITTER', lines: [] },
      { zone: 'fwd', label: 'ANTI-PROTON SWEEP', lines: ['Counter-cloak detection'] },
      { zone: 'mid', label: 'VENTRAL EVA AIRLOCK', lines: ['Hull work'] },
      { zone: 'aft', label: 'WORKBEE BAY', lines: ['4 units, unpressurised',
                                                   'The closest thing to a hangar aboard'] }
    ] }
];
