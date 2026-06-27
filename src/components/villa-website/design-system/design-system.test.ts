import { describe, it, expect } from "vitest";
import {
  auditDesignCompliance,
  type VillaDesignConfig,
  designAuditRules,
  goldenSpacing,
  organicEasing,
} from "./index";

describe("Villa Website Design System", () => {
  describe("auditDesignCompliance", () => {
    it("passes when all anti-template requirements are met", () => {
      const config: VillaDesignConfig = {
        layoutId: "layout-a",
        previousVillaLayoutId: "layout-b",
        usesAsymmetricGrid: true,
        usesNaturalTexture: true,
        usesOrnamentalElements: true,
        usesOrganicAnimations: true,
        usesEditorialTypography: true,
        usesUniformCardGrid: false,
        usesGenericGradientHero: false,
        usesThreeColumnIcons: false,
      };

      const result = auditDesignCompliance(config);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.score).toBe(100);
    });

    it("fails when uniform card grid is used", () => {
      const config: VillaDesignConfig = {
        layoutId: "layout-a",
        usesAsymmetricGrid: true,
        usesNaturalTexture: true,
        usesOrnamentalElements: true,
        usesOrganicAnimations: true,
        usesEditorialTypography: true,
        usesUniformCardGrid: true,
        usesGenericGradientHero: false,
        usesThreeColumnIcons: false,
      };

      const result = auditDesignCompliance(config);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "no-uniform-card-grid")).toBe(true);
    });

    it("fails when layout matches previous villa", () => {
      const config: VillaDesignConfig = {
        layoutId: "layout-a",
        previousVillaLayoutId: "layout-a",
        usesAsymmetricGrid: true,
        usesNaturalTexture: true,
        usesOrnamentalElements: true,
        usesOrganicAnimations: true,
        usesEditorialTypography: true,
        usesUniformCardGrid: false,
        usesGenericGradientHero: false,
        usesThreeColumnIcons: false,
      };

      const result = auditDesignCompliance(config);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "requires-distinct-from-previous")).toBe(true);
    });

    it("fails when asymmetric grid is not used", () => {
      const config: VillaDesignConfig = {
        layoutId: "layout-a",
        usesAsymmetricGrid: false,
        usesNaturalTexture: true,
        usesOrnamentalElements: true,
        usesOrganicAnimations: true,
        usesEditorialTypography: true,
        usesUniformCardGrid: false,
        usesGenericGradientHero: false,
        usesThreeColumnIcons: false,
      };

      const result = auditDesignCompliance(config);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "requires-asymmetric-layout")).toBe(true);
    });

    it("warns but passes when optional texture/ornament are missing", () => {
      const config: VillaDesignConfig = {
        layoutId: "layout-a",
        usesAsymmetricGrid: true,
        usesNaturalTexture: false,
        usesOrnamentalElements: false,
        usesOrganicAnimations: true,
        usesEditorialTypography: true,
        usesUniformCardGrid: false,
        usesGenericGradientHero: false,
        usesThreeColumnIcons: false,
      };

      const result = auditDesignCompliance(config);
      expect(result.passed).toBe(true); // warnings don't fail the audit
      expect(result.violations).toHaveLength(2);
      expect(result.violations.every((v) => v.severity === "warning")).toBe(true);
      expect(result.score).toBeLessThan(100);
    });

    it("accumulates all violations when multiple rules are broken", () => {
      const config: VillaDesignConfig = {
        layoutId: "layout-a",
        usesAsymmetricGrid: false,
        usesNaturalTexture: false,
        usesOrnamentalElements: false,
        usesOrganicAnimations: false,
        usesEditorialTypography: false,
        usesUniformCardGrid: true,
        usesGenericGradientHero: true,
        usesThreeColumnIcons: true,
      };

      const result = auditDesignCompliance(config);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(6);
      expect(result.score).toBeLessThanOrEqual(30);
    });
  });

  describe("goldenSpacing", () => {
    it("follows golden ratio progression", () => {
      const PHI = 1.618;
      expect(goldenSpacing.xs).toBeCloseTo(0.5, 2);
      expect(goldenSpacing.sm).toBeCloseTo(0.5 * PHI, 2);
      expect(goldenSpacing.md).toBeCloseTo(0.5 * PHI ** 2, 2);
      expect(goldenSpacing.lg).toBeCloseTo(0.5 * PHI ** 3, 2);
      expect(goldenSpacing.xl).toBeCloseTo(0.5 * PHI ** 4, 2);
    });

    it("provides increasing values", () => {
      const values = [
        goldenSpacing.xs,
        goldenSpacing.sm,
        goldenSpacing.md,
        goldenSpacing.lg,
        goldenSpacing.xl,
        goldenSpacing["2xl"],
        goldenSpacing["3xl"],
      ];
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  describe("organicEasing", () => {
    it("defines all easing curves as 4-value tuples", () => {
      const curves = Object.values(organicEasing);
      for (const curve of curves) {
        expect(curve).toHaveLength(4);
        for (const val of curve) {
          expect(typeof val).toBe("number");
        }
      }
    });
  });

  describe("designAuditRules", () => {
    it("maps each rule to a requirement number", () => {
      for (const [key, rule] of Object.entries(designAuditRules)) {
        expect(rule.description).toBeTruthy();
        expect(rule.requirement).toMatch(/^\d+\.\d+$/);
      }
    });

    it("covers all anti-template rules", () => {
      const ruleKeys = Object.keys(designAuditRules);
      expect(ruleKeys).toContain("no-uniform-card-grid");
      expect(ruleKeys).toContain("no-generic-gradient-hero");
      expect(ruleKeys).toContain("no-three-column-icons");
      expect(ruleKeys).toContain("requires-asymmetric-layout");
      expect(ruleKeys).toContain("requires-natural-texture");
      expect(ruleKeys).toContain("requires-ornamental-elements");
      expect(ruleKeys).toContain("requires-organic-animation");
      expect(ruleKeys).toContain("requires-editorial-typography");
      expect(ruleKeys).toContain("requires-imagery-driven");
      expect(ruleKeys).toContain("requires-distinct-from-previous");
    });
  });
});
