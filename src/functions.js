
/**
 * @param {StyleSheetList} sheets
 * @return {Array<CSSRule>}
 */
function getCssRules (sheets) {
  const CSS_RULE_TYPES = [
    /* eslint-disable no-multi-spaces */
    'UNKNOWN_RULE',              // 0
    'STYLE_RULE',                // 1
    'CHARSET_RULE',              // 2
    'IMPORT_RULE',               // 3
    'MEDIA_RULE',                // 4
    'FONT_FACE_RULE',            // 5
    'PAGE_RULE',                 // 6
    'KEYFRAMES_RULE',            // 7
    'KEYFRAME_RULE',             // 8
    null,                        // 9
    'NAMESPACE_RULE',            // 10
    'COUNTER_STYLE_RULE',        // 11
    'SUPPORTS_RULE',             // 12
    'DOCUMENT_RULE',             // 13
    'FONT_FEATURE_VALUES_RULE',  // 14
    'VIEWPORT_RULE',             // 15
    'REGION_STYLE_RULE'          // 16
    /* eslint-enable no-multi-spaces */
  ]

  let rules = []
  for (let {cssRules} of sheets) {
    for (let rule of cssRules) {
      switch (CSS_RULE_TYPES[rule.type]) {
        case 'STYLE_RULE':
          rules.push(rule)
          break
        case 'MEDIA_RULE':
          rules.push(...rule.cssRules)
          break
      }
    }
  }

  return rules
}

/**
 * @param {Function} matches
 * @param {Array<CSSRule>} rules
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Number} depth
 * @return {Object}
 */
function findRulesForElement (matches, rules, element, options, depth) {
  const result = {
    matches: rules.reduce((acc, rule) => {
      let hasMatch = false
      const selector = rule.selectorText.split(/\s*,\s*/).map(part => {
        let parsed
        if (options.findPartialMatches) {
          parsed = findMatchingPartOfSelector(matches, element, part, depth)
        } else {
          parsed = testIfSelectorIsMatch(matches, element, part)
        }

        if (parsed[1]) {
          hasMatch = true
        }

        return parsed
      })

      if (hasMatch) {
        acc.push(formatRule(selector, rule, options))
      }

      return acc
    }, [])
  }

  if (options.recursive === true) {
    const depthOfChildren = depth + 1
    result.children = Array.prototype.map.call(element.children, child => {
      return findRulesForElement(matches, rules, child, options, depthOfChildren)
    })
  }

  return result
}

/**
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {String} selector
 * @return {Array<String>}
 */
function testIfSelectorIsMatch (matches, element, selector) {
  if (matches(element, selector)) {
    return ['', selector]
  }

  return [selector, '']
}

/**
 * returns an array that contains 2 strings: [<unmatched>, <matched>]
 * joining the two strings with a space produces the original selector
 * if the <matched> string is empty, there was NO MATCH found
 * if neither string is empty, it was a partial match
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {String} selector
 * @param {Number} depth
 * @return {Array<String>}
 */
function findMatchingPartOfSelector (matches, element, selector, depth) {
  const parts = selector.split(/\s+/)
  for (let i = 0, part = parts[i]; part; part = parts[++i]) {
    if (/[>+~]/.test(part)) {
      if (combinatorPreventsMatch(matches, element, parts, i, depth)) {
        break
      }

      continue
    }

    const matched = parts.slice(i).join(' ')
    if (matches(element, matched)) {
      const unmatched = parts.slice(0, i).join(' ')
      return [unmatched, matched]
    }
  }

  return [selector, '']
}

/**
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {Array<String>} parts
 * @param {Number} index - index of the combinator in question
 * @param {Number} elementDepth
 * @return {Boolean}
 */
function combinatorPreventsMatch (matches, element, parts, index, elementDepth) {
  if (elementDepth < 1) {
    return false
  }

  if (selectorHasDescendentCombinator(parts, index)) {
    return false
  }

  /*
  if we're testing selectors against the element at depth 2
  the following selector is a potential match, because
  it has enough > combinators to reach that depth

  div > div > div { ... }

  <div depth="0" />
    <div depth="1" />
      <div depth="2" />
  */
  let depthDiff = elementDepth
  // combinators won't appear consecutively,
  // so we can start the search at index + 2
  for (let i = index + 2; i < parts.length; i++) {
    if (parts[i] === '>') {
      depthDiff--
    }
  }

  if (depthDiff < 1) {
    return false
  }

  const selector = parts.slice(0, index).join(' ')
  const {elements, depth} = getElementsUsingCombinator(element, parts[index], elementDepth)
  return !elements.some(node => findMatchingPartOfSelector(matches, node, selector, depth)[1])
}

/**
 * if index is -1, search the entire selector
 * otherwise, begin searching at the given index,
 * but in that case parts[i] must be a combinator
 * @param {Array<String>} parts
 * @param {Number} index
 * @return {Boolean}
 */
function selectorHasDescendentCombinator (parts, index) {
  for (let i = index + 1; i < parts.length - 1; i++) {
    // descendent combinators are implied when
    // 2 consecutive elements are not > + or ~
    if (/[>+~]/.test(parts[i + 1])) {
      i++
    } else {
      return true
    }
  }

  return false
}

/**
 * @param {DOMElement} element
 * @param {String} combinator
 * @param {Number} depth
 * @return {Object}
 */
function getElementsUsingCombinator (element, combinator, depth) {
  const elements = []
  let depthOfElements = depth
  if (combinator === '>') {
    if (element.parentNode) {
      elements.push(element.parentNode)
    }
    depthOfElements--
  } else if (combinator === '+') {
    if (element.previousElementSibling) {
      elements.push(element.previousElementSibling)
    }
  } else if (combinator === '~') {
    let el = element
    while ((el = el.previousElementSibling)) {
      elements.unshift(el)
    }
  }

  return {elements, depth: depthOfElements}
}

/**
 * @param {Array<Array<String>>} selector
 * @param {CSSRule} rule
 * @param {Object} options
 * @return {Object}
 */
function formatRule (selector, rule, options) {
  const ruleObj = {selector}
  if (rule.parentRule && rule.parentRule.media) {
    ruleObj.mediaText = rule.parentRule.media.mediaText
  }

  if (options.cssText === true) {
    ruleObj.cssText = rule.cssText
  }

  if (options.findPartialMatches) {
    ruleObj.isPartialMatch = selector.every(([unmatched]) => unmatched)
  }

  return ruleObj
}

export {
  getCssRules,
  findRulesForElement,
  testIfSelectorIsMatch,
  findMatchingPartOfSelector,
  combinatorPreventsMatch,
  selectorHasDescendentCombinator,
  getElementsUsingCombinator,
  formatRule
}
