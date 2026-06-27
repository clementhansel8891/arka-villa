// ─────────────────────────────────────────────────────────────────────────────
// Villa Website Design System — Barrel Export
//
// Anti-template design system for luxury Balinese villa websites.
// Every component is crafted to avoid generic template patterns:
//   ✗ No uniform card grids
//   ✗ No generic gradient heroes
//   ✗ No three-column icon layouts
//   ✓ Asymmetric compositions with intentional whitespace
//   ✓ Natural material textures (stone, wood, woven elements)
//   ✓ Gold leaf accents, Balinese ornamental patterns
//   ✓ Scroll-triggered animations that feel organic
//   ✓ Mix of serif display fonts and clean body text
// ─────────────────────────────────────────────────────────────────────────────

// Typography — editorial serif display + clean body text
export {
  VillaTypography,
  DropCap,
  PullQuote,
  SectionLabel,
  type TypographyVariant,
  type TypographyProps,
  type DropCapProps,
  type PullQuoteProps,
  type SectionLabelProps,
} from "./typography";

// Layout — organic grids, golden ratio spacing, asymmetric compositions
export {
  AsymmetricGrid,
  StaggeredSection,
  OverlapLayer,
  FullBleedSection,
  VariedContainer,
  OrganicMasonry,
  GoldenSpacer,
  goldenSpacing,
  type AsymmetricGridVariant,
  type AsymmetricGridProps,
  type StaggeredSectionProps,
  type OverlapLayerProps,
  type FullBleedSectionProps,
  type ContainerWidth,
  type VariedContainerProps,
  type OrganicMasonryProps,
  type GoldenSpacerProps,
} from "./layout";

// Textures — natural material overlays (batik, stone, wood, gold leaf)
export {
  TextureOverlay,
  NaturalGradientOverlay,
  MaterialSurface,
  type TextureType,
  type TextureOverlayProps,
  type NaturalGradient,
  type NaturalGradientProps,
  type MaterialSurface as MaterialSurfaceVariant,
  type MaterialSurfaceProps,
} from "./textures";

// Animations — scroll-triggered reveals, parallax, micro-interactions
export {
  ScrollReveal,
  CascadeContainer,
  CascadeItem,
  ParallaxLayer,
  SectionParallax,
  FloatingElement,
  ImageReveal,
  HoverLift,
  organicEasing,
  type RevealDirection,
  type ScrollRevealProps,
  type CascadeContainerProps,
  type ParallaxLayerProps,
  type SectionParallaxProps,
  type FloatingElementProps,
  type ImageRevealStyle,
  type ImageRevealProps,
  type HoverLiftProps,
} from "./animations";

// Ornaments — Balinese ornamental dividers and decorative elements
export {
  OrnamentalDivider,
  CornerOrnament,
  OrnamentalFrame,
  DotPattern,
  FloralAccent,
  SectionSeparator,
  type OrnamentStyle,
  type OrnamentalDividerProps,
  type CornerPosition,
  type CornerOrnamentProps,
  type OrnamentalFrameProps,
  type DotPatternProps,
  type FloralAccentProps,
  type SectionSeparatorProps,
} from "./ornaments";

// ─── Design Audit Utilities ──────────────────────────────────────────────────

/**
 * Anti-template design audit checklist.
 * Used to programmatically verify that villa website implementations
 * meet bespoke design standards and avoid generic patterns.
 */
export interface DesignAuditResult {
  passed: boolean;
  violations: DesignViolation[];
  score: number; // 0-100
}

export interface DesignViolation {
  rule: AntiTemplateRule;
  severity: "error" | "warning";
  description: string;
  element?: string;
}

export type AntiTemplateRule =
  | "no-uniform-card-grid"
  | "no-generic-gradient-hero"
  | "no-three-column-icons"
  | "requires-asymmetric-layout"
  | "requires-natural-texture"
  | "requires-ornamental-elements"
  | "requires-organic-animation"
  | "requires-editorial-typography"
  | "requires-imagery-driven"
  | "requires-distinct-from-previous";

/**
 * Audit rules definition for the bespoke design verification process.
 * Each rule maps to a specific anti-template requirement from the spec.
 */
export const designAuditRules: Record<AntiTemplateRule, { description: string; requirement: string }> = {
  "no-uniform-card-grid": {
    description: "Must not use repetitive card grids with uniform spacing as primary content structure",
    requirement: "43.2",
  },
  "no-generic-gradient-hero": {
    description: "Must not use generic gradient hero sections with centered heading and subtitle",
    requirement: "43.2",
  },
  "no-three-column-icons": {
    description: "Must not use three-column feature layouts with identical icon-title-description patterns",
    requirement: "43.2",
  },
  "requires-asymmetric-layout": {
    description: "Must incorporate asymmetric/organic layout elements with varied widths and stagger",
    requirement: "43.3",
  },
  "requires-natural-texture": {
    description: "Must include natural material textures (stone, wood, woven elements)",
    requirement: "43.5",
  },
  "requires-ornamental-elements": {
    description: "Must include Balinese-inspired decorative elements (textures, borders, dividers)",
    requirement: "43.5",
  },
  "requires-organic-animation": {
    description: "Must implement organic reveal animations (not generic fade-up patterns)",
    requirement: "43.6",
  },
  "requires-editorial-typography": {
    description: "Must use editorial typography with intentional hierarchy and serif display fonts",
    requirement: "43.4",
  },
  "requires-imagery-driven": {
    description: "Must feature imagery as primary content driver with text integrated into visual composition",
    requirement: "43.4",
  },
  "requires-distinct-from-previous": {
    description: "Must differ in layout composition from the most recently created Villa_Website",
    requirement: "43.8",
  },
};

/**
 * Performs a structural audit of a villa website configuration.
 * Checks that the design system components are used correctly and
 * that anti-template rules are not violated.
 */
export function auditDesignCompliance(config: VillaDesignConfig): DesignAuditResult {
  const violations: DesignViolation[] = [];

  // Check for asymmetric layout usage
  if (!config.usesAsymmetricGrid) {
    violations.push({
      rule: "requires-asymmetric-layout",
      severity: "error",
      description: "Villa website must use at least one AsymmetricGrid or StaggeredSection layout",
    });
  }

  // Check for natural textures
  if (!config.usesNaturalTexture) {
    violations.push({
      rule: "requires-natural-texture",
      severity: "warning",
      description: "Villa website should incorporate natural material textures",
    });
  }

  // Check for ornamental elements
  if (!config.usesOrnamentalElements) {
    violations.push({
      rule: "requires-ornamental-elements",
      severity: "warning",
      description: "Villa website should include Balinese ornamental dividers or frames",
    });
  }

  // Check for organic animations
  if (!config.usesOrganicAnimations) {
    violations.push({
      rule: "requires-organic-animation",
      severity: "error",
      description: "Villa website must use organic scroll-triggered animations",
    });
  }

  // Check for editorial typography
  if (!config.usesEditorialTypography) {
    violations.push({
      rule: "requires-editorial-typography",
      severity: "error",
      description: "Villa website must use serif display typography for headings",
    });
  }

  // Check for distinct layout from previous
  if (config.previousVillaLayoutId && config.layoutId === config.previousVillaLayoutId) {
    violations.push({
      rule: "requires-distinct-from-previous",
      severity: "error",
      description: "Villa website layout must differ from the most recently created villa",
    });
  }

  // Check for forbidden patterns
  if (config.usesUniformCardGrid) {
    violations.push({
      rule: "no-uniform-card-grid",
      severity: "error",
      description: "Uniform card grids are not permitted as primary content structure",
    });
  }

  if (config.usesGenericGradientHero) {
    violations.push({
      rule: "no-generic-gradient-hero",
      severity: "error",
      description: "Generic gradient heroes with centered text are not permitted",
    });
  }

  if (config.usesThreeColumnIcons) {
    violations.push({
      rule: "no-three-column-icons",
      severity: "error",
      description: "Three-column icon-title-description layouts are not permitted",
    });
  }

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;
  const totalRules = Object.keys(designAuditRules).length;
  const score = Math.max(0, Math.round(((totalRules - errorCount - warningCount * 0.5) / totalRules) * 100));

  return {
    passed: errorCount === 0,
    violations,
    score,
  };
}

/**
 * Configuration object describing a villa website's design choices.
 * Used by the audit system to verify anti-template compliance.
 */
export interface VillaDesignConfig {
  layoutId: string;
  previousVillaLayoutId?: string;
  usesAsymmetricGrid: boolean;
  usesNaturalTexture: boolean;
  usesOrnamentalElements: boolean;
  usesOrganicAnimations: boolean;
  usesEditorialTypography: boolean;
  usesUniformCardGrid: boolean;
  usesGenericGradientHero: boolean;
  usesThreeColumnIcons: boolean;
}
