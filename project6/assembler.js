const fs = require('fs');
const readline = require('readline');
const SYMBOL_AT_THE_RATE_OF = '@';
const INSTRUCTION_BITS_TO_BE_PREPENDED = '111';
const fileName = './pong/Pong.asm';

const symbolTable = {
  'R0': 0,
  'R1': 1,
  'R2': 2,
  'R3': 3,
  'R4': 4,
  'R5': 5,
  'R6': 6,
  'R7': 7,
  'R8': 8,
  'R9': 9,
  'R10': 10,
  'R11': 11,
  'R12': 12,
  'R13': 13,
  'R14': 14,
  'R15': 15,
  'SCREEN': 16384,
  'KBD': 24576,
  'SP': 0,
  'LCL': 1,
  'ARG': 2,
  'THIS': 3,
  'THAT': 4
}

const COMPARISON_TO_INSTRUCTION_PART_MAP = {
	'0': {
		'0': '101010',
		'1': '111111',
		'-1': '111010',
		'D': '001100',
		'A': '110000',
		'!D': '001101',
		'!A': '110001',
		'-D': '001111',
		'-A': '110011',
		'D+1': '011111',
		'A+1': '110111',
		'D-1': '001110',
		'A-1': '110010',
		'D+A': '000010',
		'D-A': '010011',
		'A-D': '000111',
		'D&A': '000000',
		'D|A': '010101'
	},
	'1': {
		'M': '110000',
		'!M': '110001',
		'-M': '110011',
		'M+1': '110111',
		'M-1': '110010',
		'D+M': '000010',
		'D-M': '010011',
		'M-D': '000111',
		'D&M': '000000',
		'D|M': '010101'
	}
};

const DESTINATION_TO_INSTRUCTION_PART_MAP = {
  'null': '000',
	'M': '001',
	'D': '010',
	'MD': '011',
	'A': '100',
	'AM': '101',
	'AD': '110',
	'AMD': '111'
}

const JUMP_TO_INSTRUCTION_PART_MAP = {
	'null': '000',
	'JGT': '001',
	'JEQ': '010',
	'JGE': '011',
	'JLT': '100',
	'JNE': '101',
	'JLE': '110',
	'JMP': '111'
}

let labelCount = 0;
let variableCount = 15;
const processedLines = [];

function start(){
  let lineNumber = 0;
  const rd = readline.createInterface({
    input: fs.createReadStream(fileName),
  });

  rd.on('line', function(line){
    const preprocessedLine = removeSpacesAndCommentsFromLine(line);
    if(preprocessedLine.length){
      lineNumber += 1;
      addSymbolsToSymbolTable(preprocessedLine);
      processedLines.push(preprocessedLine);
    }
  });

  function removeSpacesAndCommentsFromLine(line){
    // Removes all the whitespace in the text file
    line = line.replace(/(\/\*[^*]*\*\/)|(\/\/[^*]*)/g,'').replace(/\n?\t/g, '').replace(/\s/g,'');
    return line;
  }

  function addSymbolsToSymbolTable(line) {
    const symbolsRegExp = new RegExp(/^\(([A-Z]|[_]|[.]|[$]|[0-9]*)+\)$/gi).test(line);
    if (symbolsRegExp) {
        labelCount += 1;
        const symbol = line.substr(1,line.length-2);
        symbolTable[symbol] = lineNumber - labelCount;
    }
  }

  rd.on('close', () => {
    Assembler(processedLines);
  });
}

function Assembler(lines){
    const instructionSet = [];
    lines.forEach((line) => {
        const preprocessedLine = handleLabels(line);
        if(preprocessedLine.length){
            addVariablesToSymbolTable(preprocessedLine);
            const instruction = processLineAndReturnMachineInstruction(line);
            if(instruction.length){
                instructionSet.push(instruction);
            }
        }
    });
  
    function handleLabels(line){
      return line.includes('(') ? '' : line;
    }
  
    function addVariablesToSymbolTable(line) {
      const variableRegExp = new RegExp(/^@[a-zA-Z]/).test(line);
      if(variableRegExp){
          const variable = line.substr(1,line.length);
          if(!symbolTable[variable] && symbolTable[variable] !== 0){
            variableCount += 1;
            symbolTable[variable] = variableCount;
          }
      }
    }
  
    function processLineAndReturnMachineInstruction(line){
      let instruction = '';
      if(line.length){
        instruction = convertToMachineLanguageInstruction(line);
      }
      return instruction;
    }
  
    function isNumber(line){
      return new RegExp(/(^[0-9][0-9]+[0-9]$)|(^[0-9][0-9]+$)|^[0-9]$/gi).test(line);
    }
    
    function convertToMachineLanguageInstruction(line){
      let instruction = '';
      const isAInstruction = checkIfInstructionIsAType(line);
      if(isAInstruction){
        const memoryAddress = line.substring(1,line.length);
        const transformedMemoryAddress = isNumber(memoryAddress) ? memoryAddress : symbolTable[memoryAddress];
        let memoryAddressInBinary = Number(transformedMemoryAddress).toString(2);
        while (memoryAddressInBinary.length < 16) {
          memoryAddressInBinary = `0${memoryAddressInBinary}`;
        }
        instruction = memoryAddressInBinary;
      }else{ 
        const comparisonInstructionPart = calculateComparisonInstructionPart(line);
        const destinationInstructionPart = calculateDestinationInstructionPart(line);
        const jumpInstructionPart = calculateJumpInstructionPart(line);
        instruction = `${INSTRUCTION_BITS_TO_BE_PREPENDED}${comparisonInstructionPart}${destinationInstructionPart}${jumpInstructionPart}`;
      }
      return instruction;
    }
    
    function checkIfInstructionIsAType(line){
      return line[0] === SYMBOL_AT_THE_RATE_OF;
    }
    
    function calculateComparisonInstructionPart(line){
      let comparisonInstructionPart = '';
      let comparisonString = '0';
      const indexOfEqualityOperator = line.indexOf('=');
      const indexOfJumpOperator = line.indexOf(';');
      if(indexOfEqualityOperator > -1){
        if(indexOfJumpOperator > - 1){
            comparisonString = line.substring(indexOfEqualityOperator + 1, indexOfJumpOperator);  
        }else{
            comparisonString = line.substring(indexOfEqualityOperator + 1, line.length);
        }
      }else{
        if(indexOfJumpOperator > -1){
            comparisonString = line.substring(0, indexOfJumpOperator);
        }
      }
      const possibleComparisonValuesForABitInstruction = Object.keys(COMPARISON_TO_INSTRUCTION_PART_MAP['1']);
      let aBitInstructionPart = '0';
      if(possibleComparisonValuesForABitInstruction.includes(comparisonString)){
        aBitInstructionPart = '1';
      }
      comparisonInstructionPart = `${aBitInstructionPart}${COMPARISON_TO_INSTRUCTION_PART_MAP[aBitInstructionPart][comparisonString]}`;
      return comparisonInstructionPart;
    }
    
    function calculateDestinationInstructionPart(line){
      let destinationInstructionPart = '';
      let destinationString = 'null';
      const indexOfEqualityOperator = line.indexOf('=');
      if(indexOfEqualityOperator > -1){
        destinationString = line.substring(0,indexOfEqualityOperator);
      }
      destinationInstructionPart = DESTINATION_TO_INSTRUCTION_PART_MAP[destinationString];
      return destinationInstructionPart;
    }
    
    function calculateJumpInstructionPart(line){
      let jumpInstructionPart = '';
      let jumpString = 'null';
      const indexOfJumpOperator = line.indexOf(';');
      if(indexOfJumpOperator > -1){
        jumpString = line.substring(indexOfJumpOperator + 1, line.length); 
      }
      jumpInstructionPart = JUMP_TO_INSTRUCTION_PART_MAP[jumpString];
      return jumpInstructionPart;
    }

    createHackFile(instructionSet);
    
    function createHackFile(instructionSet) {
        if (fs.existsSync(fileName.substr(0,fileName.indexOf('.')) + '.hack')) {
            fs.unlinkSync(fileName.substr(0,fileName.indexOf('.')) + '.hack');
        }
        for (var i = 0; i < instructionSet.length; i++) {
            fs.appendFileSync(fileName.substr(0,fileName.indexOf('.')) + '.hack',instructionSet[i] + "\n");
        }
    }
}

start()
