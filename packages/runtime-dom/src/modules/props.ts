// __UNSAFE__
// Reason: potentially setting innerHTML.
// This can come from explicit usage of v-html or innerHTML as a prop in render
// functions. The user is reponsible for using them with only trusted content.
export function patchDOMProp(
  el: any,
  key: string,
  value: any,
  // the following args are passed only due to potential innerHTML/textContent
  // overriding existing VNodes, in which case the old tree must be properly
  // unmounted.
  prevChildren: any,
  parentComponent: any,
  parentSuspense: any,
  unmountChildren: any
) {
  if (key === 'innerHTML' || key === 'textContent') {
    if (prevChildren) {
      unmountChildren(prevChildren, parentComponent, parentSuspense)
    }
    el[key] = value == null ? '' : value
    return
  }
  if (key === 'value' && el.tagName !== 'PROGRESS') {
    // store value as _value as well since
    // non-string values will be stringified.
    el._value = value
    el.value = value == null ? '' : value
    return
  }
  if (value === '' && typeof el[key] === 'boolean') {
    // e.g. <select multiple> compiles to { multiple: '' }
    el[key] = true
  } else if (isStringAttribute(el.tagName, key)) {
    el[key] = value == null ? '' : value
  } else {
    el[key] = value
  }
}

function isStringAttribute(tagName: any, key: string) {
  try {
    // some dom properties accept '' but not other strings, e.g. <video>.volume
    document.createElement(tagName)[key] = 'test string'
    return true
  } catch (e) {
    if (e.name !== 'TypeError') throw e

    return false
  }
}
