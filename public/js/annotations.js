/* ==========================================================================
   Readout groups for the annotation overlay.

   Every item carries an `at` map of view -> [u, v], normalised inside the
   hull's on-screen rectangle: u runs 0 at the transom to 1 at the bow on the
   plan and elevation views, and 0 to 1 across the beam on the bow and stern
   aspects; v runs top to bottom of the hull.

   Anchors were measured off the reference renders — the emitter and heat-vane
   positions come from locating them in the art rather than being placed by eye.
   An item only appears in a view where its hardware is actually visible: the
   cloak generator has no business being pinned on the bow aspect.
   ========================================================================== */

export const READOUTS = [
  {
    id: 'hull',
    button: 'HULL &amp; STRUCTURE',
    title: 'HULL DATA & STRUCTURE',
    items: [
      { label: 'CLASSIFICATION',
        lines: ['Heavy Assault / Interdictor', 'Prototype — Advanced Tactical Design Bureau'],
        at: { top: [0.60, 0.50], starboard: [0.58, 0.30], forward: [0.50, 0.13],
              aft: [0.50, 0.14], ventral: [0.60, 0.50] } },

      { label: 'DIMENSIONS',
        lines: ['Length 455 m · Beam 280 m', '14 decks, compressed profile'],
        at: { top: [0.30, 0.14], starboard: [0.20, 0.30], forward: [0.10, 0.50],
              aft: [0.08, 0.50], ventral: [0.30, 0.86] } },

      { label: 'MASS',
        lines: ['3,250,000 metric tonnes'],
        at: { starboard: [0.72, 0.62], ventral: [0.44, 0.50] } },

      { label: 'HULL GEOMETRY',
        lines: ['Lifting-body wedge configuration',
                'Nova-class angular saucer fused to a Defiant-class',
                'integrated superstructure — no secondary hull, no neck'],
        at: { top: [0.78, 0.30], starboard: [0.50, 0.22] } },

      { label: 'ABLATIVE ARMOR MATRIX',
        lines: ['High-density plating, 18 cm',
                'Integrated with the structural integrity field',
                'Matte gunmetal, sensor-absorbent'],
        at: { top: [0.88, 0.70], starboard: [0.78, 0.40], forward: [0.30, 0.80],
              aft: [0.90, 0.55], ventral: [0.88, 0.30] } },

      { label: 'NO HANGAR',
        lines: ['Volume reallocated to engineering', 'and EPS capacitor banks'],
        at: { aft: [0.50, 0.86], ventral: [0.18, 0.28] } }
    ]
  },

  {
    id: 'propulsion',
    button: 'PROPULSION',
    title: 'PROPULSION SYSTEMS',
    items: [
      { label: 'TANDEM WARP CORE',
        lines: ['Class-9 tandem-core assembly',
                '2× independent Class-8 M/AM cores, parallel mount',
                'Core A active · Core B hot standby',
                'Automatic millisecond cutover on breach'],
        at: { top: [0.28, 0.50], starboard: [0.26, 0.52], ventral: [0.28, 0.50] } },

      { label: 'WARP PERFORMANCE',
        lines: ['Cruise warp 7', 'Maximum warp 9.975 for 12 hours'],
        at: { top: [0.40, 0.72], starboard: [0.44, 0.62] } },

      { label: 'AID IMPULSE DRIVE',
        lines: ['Advanced Impulse Drive "Afterburner"',
                'Catalyzed deuterium injection with',
                'magnetic constriction overdrive',
                'Glows intense red when engaged'],
        at: { top: [0.04, 0.41], starboard: [0.05, 0.50], aft: [0.20, 0.44],
              ventral: [0.04, 0.59] } },

      { label: 'NACELLE EMITTERS',
        lines: ['Semi-integrated into the hull flanks', 'behind heavy cowling'],
        at: { top: [0.50, 0.19], forward: [0.16, 0.29], aft: [0.80, 0.68],
              ventral: [0.50, 0.81] } },

      { label: 'RCS VENTING PORTS',
        lines: ['Phased-plasma venting',
                'High-G vectoring and turret-style',
                'rotation on the Z-axis'],
        at: { top: [0.72, 0.26], forward: [0.84, 0.67], aft: [0.33, 0.25],
              ventral: [0.72, 0.74] } }
    ]
  },

  {
    id: 'tactical',
    button: 'TACTICAL',
    title: 'TACTICAL SYSTEMS',
    items: [
      { label: 'PULSE PHASER CANNONS',
        lines: ['4× Class-X, forward-fixed', 'Recessed in the nose notch'],
        at: { top: [0.95, 0.50], forward: [0.50, 0.50], ventral: [0.95, 0.50] } },

      { label: 'PHASER STRIPS',
        lines: ['Type-X arrays', '360° dorsal and ventral coverage'],
        at: { top: [0.66, 0.34], forward: [0.68, 0.28], aft: [0.62, 0.24],
              ventral: [0.66, 0.66] } },

      { label: 'FORWARD TORPEDOES',
        lines: ['2× rapid-fire quantum launchers', 'Burst-fire capable'],
        at: { top: [0.84, 0.42], forward: [0.32, 0.42] } },

      { label: 'AFT TORPEDO LAUNCHER',
        lines: ['1× launcher, defensive and strafing'],
        at: { top: [0.14, 0.50], aft: [0.50, 0.66] } },

      { label: 'MAGAZINE',
        lines: ['250 quantum torpedoes', '100 photon torpedoes'],
        at: { top: [0.58, 0.64], ventral: [0.58, 0.36] } },

      { label: 'MARK-II "ALLIANCE" CLOAK',
        lines: ['Klingon hardware refined with',
                'Romulan stabilization algorithms',
                'Holds cloak under warp 5'],
        at: { top: [0.44, 0.50], starboard: [0.46, 0.50], ventral: [0.44, 0.50] } },

      { label: 'SUBSPACE PULSE EMITTER',
        lines: ['Forward-fixed interdiction system',
                'Projects a pressure wave into a target’s',
                'warp field — decoherence, then collapse'],
        at: { top: [0.90, 0.60], forward: [0.50, 0.72], ventral: [0.90, 0.40] } }
    ]
  },

  {
    id: 'additional',
    button: 'ADDITIONAL SYSTEMS',
    title: 'DEFENSE · CREW · COMPUTER',
    items: [
      { label: 'METAPHASIC SHIELDS',
        lines: ['Regenerative nutation cycles'],
        at: { starboard: [0.66, 0.26], forward: [0.68, 0.20], aft: [0.67, 0.25] } },

      { label: 'FLUSH-DECK RADIATORS',
        lines: ['Liquid helium loops in the dorsal spine',
                'and nacelle cowlings',
                'Glow amber venting AID and phaser heat'],
        at: { top: [0.48, 0.34], starboard: [0.34, 0.39], aft: [0.33, 0.25],
              ventral: [0.48, 0.66] } },

      { label: '"CICADA" BLAST SHUTTERS',
        lines: ['Heavy tritanium plating',
                'Seals the bridge viewscreen at red alert'],
        at: { top: [0.56, 0.50], starboard: [0.56, 0.24], forward: [0.50, 0.12] } },

      { label: 'COMPLEMENT',
        lines: ['120 officers and enlisted', '40 minimum'],
        at: { top: [0.66, 0.62], ventral: [0.66, 0.38] } },

      { label: 'HOLO-EMITTERS',
        lines: ['Hardened emitters on every deck',
                '50+ EEH / ESH simultaneously'],
        at: { top: [0.36, 0.28], starboard: [0.62, 0.62], ventral: [0.36, 0.72] } },

      { label: '"FLASH-EVAC" MESH',
        lines: ['12× Type-X "Sprint" probes',
                'Omnidirectional scatter, encrypted mesh',
                'Bio-patterns routed to safe rematerialization',
                'Functions with 40% probe loss'],
        at: { top: [0.18, 0.34], aft: [0.50, 0.82], ventral: [0.18, 0.66] } },

      { label: 'COMPUTER CORE',
        lines: ['Quad-redundant isolinear /', 'bio-neural hybrid cores',
                'Mark IV EMH standard'],
        at: { top: [0.52, 0.66], ventral: [0.52, 0.34] } }
    ]
  }
];
