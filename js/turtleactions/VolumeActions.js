/**
 * @file This contains the action methods of the Turtle's Singer component's Volume blocks.
 * @author Anindya Kundu
 * @author Walter Bender
 *
 * @copyright 2014-2020 Walter Bender
 * @copyright 2020 Anindya Kundu
 *
 * @license
 * This program is free software; you can redistribute it and/or modify it under the terms of the
 * The GNU Affero General Public License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * You should have received a copy of the GNU Affero General Public License along with this
 * library; if not, write to the Free Software Foundation, 51 Franklin Street, Suite 500 Boston,
 * MA 02110-1335 USA.
 */

/*
   global _, Singer, MusicBlocks, Mouse, last, VOICENAMES, DRUMNAMES,
   Tone, instruments, DEFAULTVOLUME, DEFAULTVOICE
*/

/*
   Global Locations
    js/utils/utils.js
        _, last
    js/turtle-singer.js
        Singer
    js/js-export/interface.js
        instruments
    js/utils/synthutils.js
        VOICENAMES, DRUMNAMES
    js/logo.js
        DEFAULTVOLUME
    js/js-export/export.js
        MusicBlocks, Mouse
    index.html
        Tone
*/

/* exported setupVolumeActions */

/**
 * Sets up all the methods related to different actions for each block in Volume palette.
 * @returns {void}
 */
function setupVolumeActions(activity) {
    Singer.VolumeActions = class {
        /**
         * Increases/decreases the volume of the contained notes by a specified amount for every note played.
         *
         * @param {String} type - crescendo or decrescendo
         * @param {Number} value - crescendo/decrescendo value
         * @param {Number} turtle - Turtle index in turtles.turtleList
         * @param {Number} [blk] - corresponding Block index in blocks.blockList
         * @returns {void}
         */
        static doCrescendo(type, value, turtle, blk) {
            const tur = activity.turtles.ithTurtle(turtle);

            tur.singer.crescendoDelta.push(type === "crescendo" ? value : -value);

            for (const synth in tur.singer.synthVolume) {
                const vol = last(tur.singer.synthVolume[synth]);
                tur.singer.synthVolume[synth].push(vol);
                if (tur.singer.crescendoInitialVolume[synth] === undefined) {
                    tur.singer.crescendoInitialVolume[synth] = [vol];
                } else {
                    tur.singer.crescendoInitialVolume[synth].push(vol);
                }
            }

            tur.singer.inCrescendo.push(true);

            const listenerName = "_crescendo_" + turtle;
            if (blk !== undefined && blk in activity.blocks.blockList) {
                activity.logo.setDispatchBlock(blk, turtle, listenerName);
            } else if (MusicBlocks.isRun) {
                const mouse = Mouse.getMouseFromTurtle(tur);
                if (mouse !== null) mouse.MB.listeners.push(listenerName);
            }

            const __listener = () => {
                if (tur.singer.justCounting.length === 0) {
                    activity.logo.notation.notationEndCrescendo(
                        turtle,
                        last(tur.singer.crescendoDelta)
                    );
                }

                tur.singer.crescendoDelta.pop();
                for (const synth in tur.singer.synthVolume) {
                    const len = tur.singer.synthVolume[synth].length;
                    tur.singer.synthVolume[synth][len - 1] = last(
                        tur.singer.crescendoInitialVolume[synth]
                    );
                    tur.singer.crescendoInitialVolume[synth].pop();
                }
            };

            activity.logo.setTurtleListener(turtle, listenerName, __listener);
        }

        /**
         * Changes the volume of the contained notes.
         *
         * @param {Number} volume
         * @param {Number} turtle - Turtle index in turtles.turtleList
         * @param {Number} [blk] - corresponding Block index in blocks.blockList
         * @returns {void}
         */
        static setRelativeVolume(volume, turtle, blk) {
            const tur = activity.turtles.ithTurtle(turtle);

            for (const synth in tur.singer.synthVolume) {
                let newVolume = (last(tur.singer.synthVolume[synth]) * (100 + volume)) / 100;
                newVolume = Math.max(Math.min(newVolume, 100), -100);

                if (tur.singer.synthVolume[synth] === undefined) {
                    tur.singer.synthVolume[synth] = [newVolume];
                } else {
                    tur.singer.synthVolume[synth].push(newVolume);
                }

                if (!tur.singer.suppressOutput) {
                    Singer.setSynthVolume(activity.logo, turtle, synth, newVolume);
                }
            }

            if (tur.singer.justCounting.length === 0) {
                activity.logo.notation.notationBeginArticulation(turtle);
            }

            const listenerName = "_articulation_" + turtle;
            if (blk !== undefined && blk in activity.blocks.blockList) {
                activity.logo.setDispatchBlock(blk, turtle, listenerName);
            } else if (MusicBlocks.isRun) {
                const mouse = Mouse.getMouseFromTurtle(tur);
                if (mouse !== null) mouse.MB.listeners.push(listenerName);
            }

            const __listener = () => {
                for (const synth in tur.singer.synthVolume) {
                    tur.singer.synthVolume[synth].pop();
                    Singer.setSynthVolume(
                        activity.logo,
                        turtle,
                        synth,
                        last(tur.singer.synthVolume[synth])
                    );
                }

                if (tur.singer.justCounting.length === 0) {
                    activity.logo.notation.notationEndArticulation(turtle);
                }
            };

            activity.logo.setTurtleListener(turtle, listenerName, __listener);
        }

        /**
         * Sets the volume for all synthesizers.
         *
         * @param {Number} volume
         * @param {Number} turtle - Turtle index in turtles.turtleList
         * @param {Number} [blk] - corresponding Block index in blocks.blockList
         * @returns {void}
         */
        static setMasterVolume(volume, turtle, blk) {
            volume = Math.max(Math.min(volume, 100), 0);

            if (volume === 0) activity.errorMsg(_("Setting volume to 0."), blk);

            if(Singer.masterVolume.length === 2) {
                Singer.masterVolume.pop();
            }

            Singer.masterVolume.push(volume);

            const tur = activity.turtles.ithTurtle(turtle);
            if (!tur.singer.suppressOutput) {
                Singer.setMasterVolume(activity.logo, volume, blk);
            }
        }

        /**
         * Sets the panning for all synthesizers.
         *
         * @param {Number} value - pan value in range (-1, 1)
         * @param {Number} turtle - Turtle index in turtles.turtleList
         * @returns {void}
         */
        static setPanning(value, turtle) {
            value = Math.max(Math.min(value, 100), -100) / 100;

            const tur = activity.turtles.ithTurtle(turtle);
            if (!tur.singer.panner) {
                tur.singer.panner = new Tone.Panner(value).toDestination();
            } else {
                tur.singer.panner.pan.value = value;
            }

            for (const synth in instruments[turtle]) {
                instruments[turtle][synth].connect(tur.singer.panner);
            }
        }

        /**
         * Sets the volume of a particular synth.
         *
         * @param {String} synthname - type of synth
         * @param {Number} volume
         * @param {Number} turtle - Turtle index in turtles.turtleList
         * @param {Number} [blk] - corresponding Block index in blocks.blockList
         * @returns {void}
         */
        static setSynthVolume(synthname, volume, turtle, blk) {
            let synth = null;
            let firstConnection = null;
            let lastConnection = null;
    
            if (activity.logo.blockList && activity.logo.blockList[blk]) {
                firstConnection = activity.logo.blockList[blk].connections[0];
                lastConnection = last(activity.logo.blockList[blk].connections);
            }

            if (synthname === DEFAULTVOICE || synthname === _(DEFAULTVOICE)) {
                synth = DEFAULTVOICE;
            } else if (synthname === "custom" || synthname === _("custom")) {
                synth = "custom";
            }

            if (synth === null) {
                for (const voice in VOICENAMES) {
                    if (VOICENAMES[voice][0] === synthname) {
                        synth = VOICENAMES[voice][1];
                        break;
                    } else if (VOICENAMES[voice][1] === synthname) {
                        synth = synthname;
                        break;
                    }
                }
            }

            if (synth === null) {
                for (const drum in DRUMNAMES) {
                    if (DRUMNAMES[drum][0].replace("-", " ") === synthname) {
                        synth = DRUMNAMES[drum][1];
                        break;
                    } else if (DRUMNAMES[drum][1].replace("-", " ") === synthname) {
                        synth = synthname;
                        break;
                    }
                }
            }

            if (synth === null) {
                activity.errorMsg(synth + "not found");
                synth = DEFAULTVOICE;
            }

            const tur = activity.turtles.ithTurtle(turtle);

            if (!tur.singer.instrumentNames.includes(synth)) {
                tur.singer.instrumentNames.push(synth);
                activity.logo.synth.loadSynth(turtle, synth);

                if (tur.singer.synthVolume[synth] === undefined) {
                    tur.singer.synthVolume[synth] = [DEFAULTVOLUME];
                    tur.singer.crescendoInitialVolume[synth] = [DEFAULTVOLUME];
                }
            }

            tur.singer.synthVolume[synth].push(volume);
            if (!tur.singer.suppressOutput) {
                Singer.setSynthVolume(activity.logo, turtle, synth, volume);
                if(firstConnection === null && lastConnection === null) {
                    setTimeout(()=>{
                        activity.logo.synth.trigger(0, "G4", 1 / 4, synthname, null, null, false);
                    },250);
                }
             
            }
        }

        /**
         * Returns the master volume.
         *
         * @returns {Number} master volume
         */
        static get masterVolume() {
            return last(Singer.masterVolume);
        }

        /**
         * Returns the current volume of the current synthesizer.
         *
         * @param {String} targetSynth
         * @param {Number} turtle - Turtle index in turtles.turtleList
         * @returns {Number} synth volume
         */
        static getSynthVolume(targetSynth, turtle) {
            const tur = activity.turtles.ithTurtle(turtle);

            for (const synth in tur.singer.synthVolume) {
                if (synth === targetSynth) {
                    return last(tur.singer.synthVolume[synth]);
                }
            }
        }
    };
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = setupVolumeActions;
}
