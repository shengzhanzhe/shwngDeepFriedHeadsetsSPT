import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { ILogger } from "@spt/models/spt/utils/ILogger";

class HeadsetsOnSteroids implements IPostDBLoadMod {
    public postDBLoad(container: DependencyContainer): void {
        const logger = container.resolve<ILogger>("WinstonLogger");
        const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const tables = databaseServer.getTables();
        const items = tables.templates.items;

        // Crunchy but not extreme, with more ambient reduction
        const multipliers = {
            AmbientVolume: 3,                  // 300% of original (stronger ambient reduction)
            HeadphonesMixerVolume: 2.0,        // 200% louder overall
            CompressorGain: 1.6,               // 160% of original
            CompressorThreshold: 1.2,          // 120% (slightly more compression)
            EQBand1Gain: 1.5,                  // Crunchy lows
            EQBand2Gain: 1.5,                  // Crunchy mids
            EQBand3Gain: 1.5,                  // Slightly crunchy highs
            HighpassFreq: 0.75,                // Let more bass through
            DryVolume: 0.7,                    // 70% of original (more dry/crunch)
            RolloffMultiplier: 1.00015         // Slightly increased for better distance audibility
        };

        function applyPercent(val: number, percent: number, clampMin?: number, clampMax?: number) {
            let result = val * percent;
            if (typeof clampMin === "number") result = Math.max(result, clampMin);
            if (typeof clampMax === "number") result = Math.min(result, clampMax);
            return result;
        }

        // --- HEADSET BOOST + CRUNCH ---
        for (const id in items) {
            const item = items[id];
            if (!item || !item._props) continue;
            const p = item._props;

            if (
                typeof p.AmbientVolume === "number" &&
                typeof p.HeadphonesMixerVolume === "number" &&
                typeof p.CompressorGain === "number" &&
                typeof p.CompressorThreshold === "number" &&
                typeof p.EQBand1Gain === "number" &&
                typeof p.EQBand2Gain === "number" &&
                typeof p.EQBand3Gain === "number" &&
                typeof p.HighpassFreq === "number" &&
                typeof p.DryVolume === "number"
            ) {
                // Set ClientPlayerCompressorSendLevel to 0 for clarity
                if (typeof p.ClientPlayerCompressorSendLevel === "number") {
                    p.ClientPlayerCompressorSendLevel = 12;
                }
                // Ambient reduction (stronger)
                p.AmbientVolume = applyPercent(p.AmbientVolume, multipliers.AmbientVolume, -50, 50);
                // Crunchy boost
                p.HeadphonesMixerVolume = applyPercent(p.HeadphonesMixerVolume, multipliers.HeadphonesMixerVolume, -10, 10);
                p.CompressorGain = applyPercent(p.CompressorGain, multipliers.CompressorGain, 0, 20);
                p.CompressorThreshold = applyPercent(p.CompressorThreshold, multipliers.CompressorThreshold, -80, -10);
                p.EQBand1Gain = applyPercent(p.EQBand1Gain, multipliers.EQBand1Gain, 0, 5);
                p.EQBand2Gain = applyPercent(p.EQBand2Gain, multipliers.EQBand2Gain, 0, 5);
                p.EQBand3Gain = applyPercent(p.EQBand3Gain, multipliers.EQBand3Gain, 0, 5);
                p.HighpassFreq = applyPercent(p.HighpassFreq, multipliers.HighpassFreq, 50, 1000);
                p.DryVolume = applyPercent(p.DryVolume, multipliers.DryVolume, -60, 0);

                // Set RolloffMultiplier to make sounds easier to hear from farther away (but not exaggerated)
                if (typeof p.RolloffMultiplier === "number") {
                    p.RolloffMultiplier = Math.min(Math.max(1.15, p.RolloffMultiplier), 1.35);
                }

                // Optional: tweak other crunchy-related values if present
                if (typeof p.Distortion === "number") {
                    p.Distortion = Math.min(p.Distortion * 1.2, 1.0); // subtle extra crunch
                }

                // Make NPC footsteps more dominant
                if (typeof p.NpcCompressorSendLevel === "number") {
                    if (p.NpcCompressorSendLevel === 0) {
                        p.NpcCompressorSendLevel = 12;
                    } else {
                        p.NpcCompressorSendLevel = p.NpcCompressorSendLevel * 12;
                    }
                }
                // Make observed player footsteps more dominant
                if (typeof p.ObservedPlayerCompressorSendLevel === "number") {
                    if (p.ObservedPlayerCompressorSendLevel === 0) {
                        p.ObservedPlayerCompressorSendLevel = 12;
                    } else {
                        p.ObservedPlayerCompressorSendLevel = p.ObservedPlayerCompressorSendLevel * 12;
                    }
                }

                // Boost environmental compressor send levels for more crunch/clarity
                if (typeof p.EnvCommonCompressorSendLevel === "number") {
                    p.EnvCommonCompressorSendLevel = Math.max(p.EnvCommonCompressorSendLevel + 12, 12);
                }
                if (typeof p.EnvNatureCompressorSendLevel === "number") {
                    p.EnvNatureCompressorSendLevel = Math.max(p.EnvNatureCompressorSendLevel - 5, -5);
                }
                if (typeof p.EnvTechnicalCompressorSendLevel === "number") {
                    p.EnvTechnicalCompressorSendLevel = Math.max(p.EnvTechnicalCompressorSendLevel + 12, 12);
                }
            }
        }
    }
}

module.exports = { mod: new HeadsetsOnSteroids() };