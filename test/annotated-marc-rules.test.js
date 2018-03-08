const AnnotatedMarcSerializer = require('../lib/annotated-marc-serializer')

describe('Annotated Marc Rules', function () {
  describe('marc tag parsing', function () {
    it('should extract simple marc tag', function () {
      const rules = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|a|100|-06|Author||b|')
      expect(rules).to.be.a('array')
      expect(rules.length).to.equal(1)

      expect(rules[0]).to.be.a('object')
      expect(rules[0].fieldGroupTag).to.equal('a')
      expect(rules[0].marcIndicatorRegExp).to.be.an.instanceOf(RegExp)
      expect(rules[0].marcIndicatorRegExp.toString()).to.equal('/^100/')
    })

    it('should extract wildcarded marc tag', function () {
      let rules = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|a|10.|-06|Author||b|')
      expect(rules).to.be.a('array')
      expect(rules.length).to.equal(1)

      expect(rules[0]).to.be.a('object')
      expect(rules[0].marcIndicatorRegExp).to.be.an.instanceOf(RegExp)
      expect(rules[0].marcIndicatorRegExp.toString()).to.equal('/^10./')

      rules = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|a|1..|-06|Author||b|')
      expect(rules).to.be.a('array')
      expect(rules.length).to.equal(1)

      expect(rules[0]).to.be.a('object')
      expect(rules[0].marcIndicatorRegExp).to.be.an.instanceOf(RegExp)
      expect(rules[0].marcIndicatorRegExp.toString()).to.equal('/^1../')
    })
  })

  describe('bib record index rules parsing', function () {
    it('should parse simple bib index marc rule', function () {
      const rules = AnnotatedMarcSerializer.bibIndexRules('037 > SERIES(s)            400        KEEP x             ISBN/ISSN(i)')
      expect(rules).to.be.a('array')

      const rule = rules.pop()
      expect(rule).to.be.a('object')
      expect(rule.indexName).to.equal('SERIES')
      expect(rule.fieldGroupTag).to.equal('s')
      expect(rule.marcIndicatorRegExp).to.be.a('RegExp')
      expect(rule.marcIndicatorRegExp.source).to.equal('400')
      expect(rule.subfieldSpec).to.be.a('object')
      expect(rule.subfieldSpec.subfields).to.have.lengthOf(1)
      expect(rule.subfieldSpec.subfields).to.have.members(['x'])
      expect(rule.subfieldSpec.directive).to.equal('include')
    })

    it('should parse 880 bib index marc rule', function () {
      const rules = AnnotatedMarcSerializer.bibIndexRules('196 > MISC(y)              880....690 REM  23468         Subject(d)')
      expect(rules).to.be.a('array')

      const rule = rules.pop()
      expect(rule).to.be.a('object')
      expect(rule.indexName).to.equal('MISC')
      expect(rule.fieldGroupTag).to.equal('y')
      expect(rule.marcIndicatorRegExp).to.be.a('RegExp')
      expect(rule.marcIndicatorRegExp.source).to.equal('880..')
      expect(rule.subfieldSpec).to.be.a('object')
      expect(rule.subfieldSpec.subfields).to.have.lengthOf(5)
      expect(rule.subfieldSpec.subfields).to.have.members(['2', '3', '4', '6', '8'])
      expect(rule.subfieldSpec.directive).to.equal('exclude')
      expect(rule.targetMarcTag).to.equal('690')
    })

    it('should parse 880 bib index marc rule with indicator regex', function () {
      const rules = AnnotatedMarcSerializer.bibIndexRules('189 > MISC(y)              880.[ 047]..611 REM  23468         Subject(d)')
      expect(rules).to.be.a('array')

      const rule = rules.pop()
      expect(rule).to.be.a('object')
      expect(rule.indexName).to.equal('MISC')
      expect(rule.fieldGroupTag).to.equal('y')
      expect(rule.marcIndicatorRegExp).to.be.a('RegExp')
      expect(rule.marcIndicatorRegExp.source).to.equal('880.[ 047]')
      expect(rule.subfieldSpec).to.be.a('object')
      expect(rule.subfieldSpec.subfields).to.have.lengthOf(5)
      expect(rule.subfieldSpec.subfields).to.have.members(['2', '3', '4', '6', '8'])
      expect(rule.subfieldSpec.directive).to.equal('exclude')
      expect(rule.targetMarcTag).to.equal('611')
    })
  })

  describe('building annotated marc rules', function () {
    it('should apply bib index rule to marc rule', function () {
      // Test rule *without bib index rule applied:
      let rule = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|s|8..|-6|Series||b|').pop()
      expect(rule).to.be.a('object')
      expect(rule.label).to.equal('Series')
      expect(rule.marcIndicatorRegExp).to.be.a('RegExp')
      expect(rule.marcIndicatorRegExp.source).to.equal('^8..')
      expect(rule.secondaryMarcIndicatorRegExp).to.be.a('RegExp')
      expect(rule.secondaryMarcIndicatorRegExp.source).to.equal('.')

      // Set up a sampling of bib-index-rules:
      const bibIndexRules = [
        '035 > SERIES(s)            400        KEEP abcd          Author(a)',
        '036 > SERIES(s)            400        KEEP ptv           Title(t)',
        '126 > SERIES(s)            800        KEEP abcdq         Author(a)',
        '127 > SERIES(s)            800        KEEP fgklmnoprstv  Title(t)',
        '130 > SERIES(s)            811        KEEP acdegnq       Author(a)',
        '163 > SERIES(s)            NON-MARC   N/A                Title(t)'
      ].join('\n')

      // Now parse same rule, but layer over it the index restriction:
      rule = AnnotatedMarcSerializer.buildAnnotatedMarcRules('b|s|8..|-6|Series||b|', bibIndexRules).pop()
      // It now has a set of "secondary" tag patterns that must be met to use label:
      expect(rule.secondaryMarcIndicatorRegExp).to.be.a('RegExp')
      expect(rule.secondaryMarcIndicatorRegExp.source).to.equal('(400|800|811)')
      expect(rule.label).to.equal('Series')
    })
  })

  describe('bib parsing', function () {
    it('identifies varfields', function () {
      const sampleBib = { varFields: [
        { marcTag: 362, ind1: '', ind2: 1 },
        { marcTag: 361, ind1: 2, ind2: 4 },
        { marcTag: 360, ind1: '', ind2: '' }
      ] }
      // Match 362, any indicators:
      const rule1 = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|a|362|-06|Publication Date||b|').pop()
      const matching = AnnotatedMarcSerializer.matchingMarcFields(sampleBib, rule1)
      // Matches only first varField:
      expect(matching).to.be.a('array')
      expect(matching).to.have.lengthOf(1)
      expect(matching[0]).to.be.a('object')
      expect(matching[0].marcTag).to.equal(362)

      // Match 362, ind2=2:
      const rule2 = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|a|362 2|-06|Publication Date||b|').pop()
      const emptyMatching = AnnotatedMarcSerializer.matchingMarcFields(sampleBib, rule2)
      // Fails because we only have a rule for 362, ind2=1
      expect(emptyMatching).to.be.a('array')
      expect(emptyMatching).to.have.lengthOf(0)

      // Match 36., any indicators:
      const rule3 = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|a|36.|-06|Publication Date||b|').pop()
      const matching3 = AnnotatedMarcSerializer.matchingMarcFields(sampleBib, rule3)
      // Matches all varFields:
      expect(matching3).to.be.a('array')
      expect(matching3).to.have.lengthOf(3)

      // Match 36[20] (not 361), any indicators:
      const rule4 = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|a|36[20]|-06|Publication Date||b|').pop()
      const matching4 = AnnotatedMarcSerializer.matchingMarcFields(sampleBib, rule4)
      // Matches two varFields:
      expect(matching4).to.be.a('array')
      expect(matching4).to.have.lengthOf(2)
      expect(matching4[1]).to.be.a('object')
      expect(matching4[1].marcTag).to.equal(360)

      // Match 36[20] (not 361), ind2 != 1:
      const rule5 = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|a|36[20] [^1]|-06|Publication Date||b|').pop()
      const matching5 = AnnotatedMarcSerializer.matchingMarcFields(sampleBib, rule5)
      // Matches only 360 because ind2 is ''
      expect(matching5).to.be.a('array')
      expect(matching5).to.have.lengthOf(1)
      expect(matching5[0]).to.be.a('object')
      expect(matching5[0].marcTag).to.equal(360)
    })
  })

  describe('subfield parsing', function () {
    it('should extract exclusionary subfield directive', function () {
      const rules = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|a|100|-06|Author||b|')
      expect(rules).to.be.a('array')
      expect(rules.length).to.equal(1)

      expect(rules[0]).to.be.a('object')
      expect(rules[0].subfieldSpec).to.be.a('object')
      expect(rules[0].subfieldSpec.directive).to.equal('exclude')
      expect(rules[0].subfieldSpec.subfields).to.be.a('array')
      expect(rules[0].subfieldSpec.subfields.length).to.equal(2)
      expect(rules[0].subfieldSpec.subfields).to.include.members(['0', '6'])
    })

    it('should extract inclusionary subfield directive', function () {
      const rules = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|r|336|a|Type of Content||b|')
      expect(rules).to.be.a('array')
      expect(rules.length).to.equal(1)

      expect(rules[0]).to.be.a('object')
      expect(rules[0].subfieldSpec).to.be.a('object')
      expect(rules[0].subfieldSpec.directive).to.equal('include')
      expect(rules[0].subfieldSpec.subfields).to.be.a('array')
      expect(rules[0].subfieldSpec.subfields.length).to.equal(1)
      expect(rules[0].subfieldSpec.subfields).to.include.members(['a'])
    })
  })

  describe('label parsing ', function () {
    it('should extract label', function () {
      let rules = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|a|100|-06|Author||b|')
      expect(rules).to.be.a('array')
      expect(rules.length).to.equal(1)

      expect(rules[0]).to.be.a('object')
      expect(rules[0].label).to.equal('Author')

      rules = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|r|336|a|Type of Content||b|')
      expect(rules).to.be.a('array')
      expect(rules.length).to.equal(1)

      expect(rules[0]).to.be.a('object')
      expect(rules[0].label).to.equal('Type of Content')
    })
  })

  describe('record serialization', function () {
    it('should serialize 310', function () {
      /*
       * We expect to match this:
      {
        "marcIndicatorRegExp": "^310",
        "subfieldSpec": {
          "subfields": [
            "6"
          ],
          "directive": "exclude"
        },
        "label": "Current Frequency"
      },
      */

      const sampleBib = {
        id: 'testid',
        nyplSource: 'testSource',
        varFields: [
          {
            fieldTag: 'r',
            marcTag: '310',
            ind1: ' ',
            ind2: ' ',
            content: null,
            subfields: [
              {
                tag: 'a',
                content: 'Weekly'
              }
            ]
          }
        ]
      }

      const serialization = AnnotatedMarcSerializer.serialize(sampleBib)
      expect(serialization).to.be.a('object')
      expect(serialization.bib).to.be.a('object')
      expect(serialization.bib.id).to.be.a('string')
      expect(serialization.bib.nyplSource).to.be.a('string')
      expect(serialization.bib.fields).to.be.a('array')
      expect(serialization.bib.fields).to.have.lengthOf(1)
      expect(serialization.bib.fields[0]).to.be.a('object')
      expect(serialization.bib.fields[0].label).to.equal('Current Frequency')
      expect(serialization.bib.fields[0].values).to.be.a('array')
      expect(serialization.bib.fields[0].values).to.have.lengthOf(1)
      expect(serialization.bib.fields[0].values[0]).to.be.a('object')
      expect(serialization.bib.fields[0].values[0].content).to.equal('Weekly')
    })

    it('should serialize title', function () {
      const sampleBib = {
        id: 'testid',
        nyplSource: 'testSource',
        varFields: [
          {
            fieldTag: 't',
            marcTag: '245',
            ind1: '0',
            ind2: '0',
            content: null,
            subfields: [
              {
                tag: 'a',
                content: 'Razvedchik'
              },
              {
                tag: 'h',
                content: '[microform] :'
              },
              {
                tag: 'b',
                content: 'zhurnal voennyĭ i literaturnyĭ.'
              }
            ]
          }
        ]
      }
      const serialization = AnnotatedMarcSerializer.serialize(sampleBib)
      expect(serialization.bib).to.be.a('object')
      expect(serialization.bib.id).to.be.a('string')
      expect(serialization.bib.nyplSource).to.be.a('string')
      expect(serialization.bib.fields).to.be.a('array')
      expect(serialization.bib.fields).to.have.lengthOf(1)
      expect(serialization.bib.fields[0]).to.be.a('object')
      expect(serialization.bib.fields[0].label).to.equal('Title')
      expect(serialization.bib.fields[0].values).to.be.a('array')
      expect(serialization.bib.fields[0].values).to.have.lengthOf(1)
      expect(serialization.bib.fields[0].values[0]).to.be.a('object')
      expect(serialization.bib.fields[0].values[0].content).to.equal('Razvedchik [microform] : zhurnal voennyĭ i literaturnyĭ.')
    })
  })

  describe('source masking', function () {
    it('should mask subfields excluded', function () {
      const sampleField = {
        marcTag: '245',
        subfields: [
          {
            tag: 'a',
            content: 'Razvedchik'
          },
          {
            tag: 'h',
            content: '[microform] :'
          }
        ]
      }

      // Build a rule that selects 245, and excludes subfields 0, 6, and h
      const rule = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|a|245|-06h|Field name||b|').pop()
      const maskedSource = AnnotatedMarcSerializer.buildSourceWithMasking(sampleField, rule)

      expect(maskedSource).to.be.a('object')
      expect(maskedSource.marcTag).to.equal('245')
      expect(maskedSource.subfields).to.be.a('array')
      expect(maskedSource.subfields).to.have.lengthOf(2)
      expect(maskedSource.subfields[0]).to.be.a('object')
      expect(maskedSource.subfields[0].tag).to.equal('a')
      expect(maskedSource.subfields[0].content).to.equal('Razvedchik')
      expect(maskedSource.subfields[1]).to.be.a('object')
      expect(maskedSource.subfields[1].tag).to.equal('h')
      expect(maskedSource.subfields[1].content).to.equal('[redacted]')
    })

    it('should mask subfields not included', function () {
      const sampleField = {
        marcTag: '245',
        subfields: [
          {
            tag: 'a',
            content: 'Razvedchik'
          },
          {
            tag: 'h',
            content: '[microform] :'
          }
        ]
      }

      // Build a rule that selects 245, but ONLY includes subfields 0, 6, and h
      const rule = AnnotatedMarcSerializer.parseWebpubToAnnotatedMarcRules('b|a|245|06h|Field name||b|').pop()
      const maskedSource = AnnotatedMarcSerializer.buildSourceWithMasking(sampleField, rule)

      expect(maskedSource).to.be.a('object')
      expect(maskedSource.marcTag).to.equal('245')
      expect(maskedSource.subfields).to.be.a('array')
      expect(maskedSource.subfields).to.have.lengthOf(2)
      expect(maskedSource.subfields[0]).to.be.a('object')
      expect(maskedSource.subfields[0].tag).to.equal('a')
      expect(maskedSource.subfields[0].content).to.equal('[redacted]')
      expect(maskedSource.subfields[1]).to.be.a('object')
      expect(maskedSource.subfields[1].tag).to.equal('h')
      expect(maskedSource.subfields[1].content).to.equal('[microform] :')
    })
  })
})
