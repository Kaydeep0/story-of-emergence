# Pattern Signature Schema

**Status:** Design contract  
**Purpose:** Define what counts as "the same pattern" across windows

This document defines the structural object that Observer v1 uses to recognize pattern persistence. It is a schema, not an implementation.

---

## 1. What a Pattern Signature Is

A pattern signature is a structural description of how activity distributes across a time window. It captures the shape of the distribution, not its meaning. It describes observable characteristics: which days have activity, how concentrated that activity is, and the relative structure of the distribution. A pattern signature is window-agnostic: it describes the same structural shape regardless of whether the window is seven days or three hundred and sixty-five days. It is a fingerprint of the distribution's geometry, not an interpretation of what that geometry means.

---

## 2. What a Pattern Signature Is NOT

A pattern signature is not:

- A conclusion about behavior or thinking
- A label that assigns meaning (e.g., "healthy," "concerning," "productive")
- A judgment about value or importance
- An explanation of cause or motivation
- A prediction about future behavior
- A trend indicator (growing, declining, stable)
- A recommendation or suggestion
- A narrative about what the pattern represents

A pattern signature describes structure. It does not interpret structure.

---

## 3. The Minimum Fields of a Pattern Signature

A pattern signature contains these observable, window-agnostic, non-semantic fields:

1. **Observed distribution fit:** Best-fit class among {normal, log-normal, power law} as determined by statistical fit to the data. Observable from the data, not assigned. Provisional and reversible.

2. **Concentration ratio:** The ratio of top activity days to average activity days. A structural measure of how concentrated the activity is, independent of absolute values.

3. **Day-of-week pattern:** Which days of the week show activity, expressed as a set (e.g., {Saturday, Sunday}). Observable structure, not interpretation.

4. **Top percentile share:** The percentage of total activity accounted for by the top 10% of days. A structural measure of concentration, window-agnostic.

5. **Relative spike threshold:** The multiplier that defines a "spike" relative to the window's baseline (e.g., 2× average). A structural threshold, not a value judgment.

These fields are sufficient to describe the structural shape of any activity distribution. They are observable, computable, and do not require interpretation.

---

## 4. Identity Rule

Observer v1 decides that two patterns are the same when:

The pattern signatures share the same observed distribution fit, the same day-of-week pattern set, and concentration ratios that fall within the same structural band (e.g., both are "highly concentrated" as defined by top percentile share thresholds, or both are "moderately concentrated"). Concentration bands must be coarse and ordinal (e.g., low, medium, high), not continuous. The relative spike threshold must also match (e.g., both use 2× baseline, or both use 3× baseline).

Absolute values do not matter. A Weekly pattern with 5 entries on Saturday and a Yearly pattern with 50 entries on Saturday are the same pattern if they share the same structural signature: same distribution classification, same day-of-week pattern, same concentration characteristics, same spike threshold.

Time direction does not matter. A pattern that appears in an earlier window and a pattern that appears in a later window are the same pattern if their signatures match, regardless of whether activity increased, decreased, or remained constant between windows.

The rule is structural equivalence, not semantic equivalence. Two patterns are the same if they have the same shape, not if they have the same meaning.

---

**This schema is a moral boundary. It prevents narrative creep, overfitting, and meaning inflation.**

**Pattern signatures describe structure. They do not interpret structure.**

