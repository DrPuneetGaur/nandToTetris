const fs = require('fs');
const readline = require('readline');
const fileName = './MemoryAccess/BasicTest/BasicTest.vm';

const STACK_OPERATIONS_MAP = {
    PUSH: 'push',
    POP : 'pop'
}

const ARITHMETIC_OPERATIONS_MAP = {
    ADD: 'add',
    SUB: 'sub',
    EQ: 'eq',
    LT: 'lt',
    GT: 'gt',
    NEG: 'neg',
    AND: 'and',
    OR: 'or',
    NOT: 'not'
}

const MEMORY_SEGMENTS_MAP = {
    ARGUMENT: 'argument',
    CONSTANT: 'constant' ,
    LOCAL: 'local',
    POINTER: 'pointer',
    STATIC: 'static',
    TEMP: 'temp',
    THAT: 'that',
    THIS: 'this'
}

const MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP = {
    'argument' : 'ARG',
    'local' : 'LCL',
    'that' : 'THAT',
    'this' : 'THIS'
}

const processedLines = [];

function start(){
  const rd = readline.createInterface({
    input: fs.createReadStream(fileName),
  });

  rd.on('line', function(line){
    const preprocessedLine = removeSpacesAndCommentsFromLine(line);
    if(preprocessedLine.length){
      processedLines.push(preprocessedLine);
    }
  });

  function removeSpacesAndCommentsFromLine(line){
    // Removes all the whitespace in the text file
    line = line.replace(/(\/\*[^*]*\*\/)|(\/\/[^*]*)/g,'').replace(/\n?\t/g, '');
    return line;
  }

  rd.on('close', () => {
    VMTranslator(processedLines);
  });
}

function VMTranslator(lines){
    lines.forEach((line) => {
        return convertToAssembly(line)
    });
}

function convertToAssembly(line){
    const check = fileName.split('/').length
    const file = fileName.split('/')[check-1];
    const instructionOperations = line.split(' ');
    const firstOperation = instructionOperations[0];
    let assemblyCommand;
    if(Object.values(STACK_OPERATIONS_MAP).includes(firstOperation)){
        const memorySegment = instructionOperations[1];
        const index = instructionOperations[2];
        assemblyCommand = handlePushAndPop(firstOperation, memorySegment, index, file);
    }else{
        assemblyCommand = handleArithmeticOperations(firstOperation);
    }
    const writer = fs.createWriteStream(`${fileName.substring(0,fileName.length-3)}.asm`, { flags: 'a'});
    writer.write(assemblyCommand);  
    console.log(assemblyCommand);
}

function handlePushAndPop(command, memorySegment, index, file){
    let assemblyCommandToReturn;
    switch(command){
        case STACK_OPERATIONS_MAP.PUSH:
            return handlePushCommand(memorySegment, index, file);
        case STACK_OPERATIONS_MAP.POP:
            return handlePopCommand(memorySegment, index, file);
    }
    return assemblyCommandToReturn;
}

function handleArithmeticOperations(command){
    let assemblyCommandToReturn;
    switch(command){
        case ARITHMETIC_OPERATIONS_MAP.ADD:
            return handleAddCommand();
        case ARITHMETIC_OPERATIONS_MAP.SUB:
            return handleSubtractCommand();
        // case ARITHMETIC_OPERATIONS_MAP.EQ:
        //     return handleEqualCommand();
        // case ARITHMETIC_OPERATIONS_MAP.LT:
        //     return handleLessThanCommand();
        // case ARITHMETIC_OPERATIONS_MAP.GT:
        //     return handleGreaterThanCommand();
        // case ARITHMETIC_OPERATIONS_MAP.NEG:
        //     return handleNegateCommand();
        // case ARITHMETIC_OPERATIONS_MAP.AND:
        //     return handleAndCommand();
        // case ARITHMETIC_OPERATIONS_MAP.OR:
        //     return handleOrCommand();
        // case ARITHMETIC_OPERATIONS_MAP.NOT:
        //     return handleNotCommand();
    }
    return assemblyCommandToReturn;
}

function handleAddCommand(){
    return (`@SP
            A=M-2
            D=M
            A=M-1
            D=D+M
            A=M-2
            M=D
            @SP
            M=M-1`)
}

function handleSubtractCommand(){
    return (`@SP
            A=M-2
            D=M
            A=M-1
            D=D-M
            A=M-2
            M=D
            @SP
            M=M-1`)
}

function handlePushCommand(memorySegment, index, file){
    if (memorySegment === MEMORY_SEGMENTS_MAP.CONSTANT){
        return pushConstantToStackV2(index);
    }else if(memorySegment === MEMORY_SEGMENTS_MAP.ARGUMENT || memorySegment === MEMORY_SEGMENTS_MAP.LOCAL || memorySegment === MEMORY_SEGMENTS_MAP.THIS || memorySegment === MEMORY_SEGMENTS_MAP.THAT){
        const binSegment = MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP[memorySegment];
        return shiftFromMemoryToStackV2(binSegment, index);
    }else if(memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.POINTER){
        const register = (3 + Number(index)).toString();
        return shiftFromRegisterToStackV2(register);
    }else if(memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.TEMP){
        const register = (5 + Number(index)).toString();
        return shiftFromRegisterToStackV2(register);
    }else{
        return shiftFromStaticToStackV2(index, file);
    }
}

function pushDRegisterToStackV2(){
    return (`@SP
            A=M
            M=D
            @SP
            M=M+1`)
}

function pushConstantToStackV2(index){
    return (`// push constant ${index}
            @${index}
            D=A
            ${pushDRegisterToStackV2()}`)
}

function shiftFromMemoryToStackV2(binSegment,index){
    return (`// push from ${binSegment}[${index}] to stack
            @${index}
            D=A
            @${binSegment}
            A=M+D
            ${pushDRegisterToStackV2()}`)
}

function shiftFromRegisterToStackV2(register){
    return (`@${register}
            D=M
            ${pushDRegisterToStackV2()}`)
}

function shiftFromStaticToStackV2(index, file){
    return (`// push from static ${index} to stack
            @${file}_${index}
            D=M
            ${pushDRegisterToStackV2()}`)
}

function handlePopCommand(memorySegment, index, file){
    if (memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.CONSTANT){
        console.log(memorySegment);
    }else if(memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.ARGUMENT || memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.LOCAL || memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.THIS || memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.THAT){
        const binSegment = MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP[memorySegment];
        return shiftFromStackToMemoryV2(binSegment, index);
    }else if(memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.POINTER){
        const register = (3 + Number(index)).toString();
        return shiftFromStackToRegisterV2(register);
    }else if(memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.TEMP){
        const register = (5 + Number(index)).toString();
        return shiftFromStackToRegisterV2(register);
    }else{
        return shiftFromStackToStaticV2(index, file);
    }
}

function pushFromStackToDRegisterV2(){
    return (`@SP
            M=M-1
            A=M
            D=M`)
}

function shiftFromStackToMemoryV2(binSegment, index){
    return (`// pop from stack to segment ${binSegment} ${index}
            @${index}
            D=A
            @${binSegment}
            D=D+M
            @R13
            M=D
            ${pushFromStackToDRegisterV2()}
            @R13
            A=M
            M=D`);
}

function shiftFromStackToRegisterV2(register){
    return (`// pop from stack to register ${register}
            @SP
            M=M-1
            A=M
            D=M
            @${register}
            M=D`);
}

function shiftFromStackToStaticV2(index, file){
    return (`// pop from stack to static ${index}
            @SP
            M=M-1
            A=M
            D=M
            @${file}_${index}
            M=D`)
}


// function Assembler(lines){
//     const instructionSet = [];
//     lines.forEach((line) => {
//         const preprocessedLine = handleLabels(line);
//         if(preprocessedLine.length){
//             addVariablesToSymbolTable(preprocessedLine);
//             const instruction = processLineAndReturnMachineInstruction(line);
//             if(instruction.length){
//                 instructionSet.push(instruction);
//             }
//         }
//     });
  
//     function handleLabels(line){
//       return line.includes('(') ? '' : line;
//     }
  
//     function addVariablesToSymbolTable(line) {
//       const variableRegExp = new RegExp(/^@[a-zA-Z]/).test(line);
//       if(variableRegExp){
//           const variable = line.substr(1,line.length);
//           if(!symbolTable[variable] && symbolTable[variable] !== 0){
//             variableCount += 1;
//             symbolTable[variable] = variableCount;
//           }
//       }
//     }
  
//     function processLineAndReturnMachineInstruction(line){
//       let instruction = '';
//       if(line.length){
//         instruction = convertToMachineLanguageInstruction(line);
//       }
//       return instruction;
//     }
  
//     function isNumber(line){
//       return new RegExp(/(^[0-9][0-9]+[0-9]$)|(^[0-9][0-9]+$)|^[0-9]$/gi).test(line);
//     }
    
//     function convertToMachineLanguageInstruction(line){
//       let instruction = '';
//       const isAInstruction = checkIfInstructionIsAType(line);
//       if(isAInstruction){
//         const memoryAddress = line.substring(1,line.length);
//         const transformedMemoryAddress = isNumber(memoryAddress) ? memoryAddress : symbolTable[memoryAddress];
//         let memoryAddressInBinary = Number(transformedMemoryAddress).toString(2);
//         while (memoryAddressInBinary.length < 16) {
//           memoryAddressInBinary = `0${memoryAddressInBinary}`;
//         }
//         instruction = memoryAddressInBinary;
//       }else{ 
//         const comparisonInstructionPart = calculateComparisonInstructionPart(line);
//         const destinationInstructionPart = calculateDestinationInstructionPart(line);
//         const jumpInstructionPart = calculateJumpInstructionPart(line);
//         instruction = `${INSTRUCTION_BITS_TO_BE_PREPENDED}${comparisonInstructionPart}${destinationInstructionPart}${jumpInstructionPart}`;
//       }
//       return instruction;
//     }
    
//     function checkIfInstructionIsAType(line){
//       return line[0] === SYMBOL_AT_THE_RATE_OF;
//     }
    
//     function calculateComparisonInstructionPart(line){
//       let comparisonInstructionPart = '';
//       let comparisonString = '0';
//       const indexOfEqualityOperator = line.indexOf('=');
//       const indexOfJumpOperator = line.indexOf(';');
//       if(indexOfEqualityOperator > -1){
//         if(indexOfJumpOperator > - 1){
//             comparisonString = line.substring(indexOfEqualityOperator + 1, indexOfJumpOperator);  
//         }else{
//             comparisonString = line.substring(indexOfEqualityOperator + 1, line.length);
//         }
//       }else{
//         if(indexOfJumpOperator > -1){
//             comparisonString = line.substring(0, indexOfJumpOperator);
//         }
//       }
//       const possibleComparisonValuesForABitInstruction = Object.keys(COMPARISON_TO_INSTRUCTION_PART_MAP['1']);
//       let aBitInstructionPart = '0';
//       if(possibleComparisonValuesForABitInstruction.includes(comparisonString)){
//         aBitInstructionPart = '1';
//       }
//       comparisonInstructionPart = `${aBitInstructionPart}${COMPARISON_TO_INSTRUCTION_PART_MAP[aBitInstructionPart][comparisonString]}`;
//       return comparisonInstructionPart;
//     }
    
//     function calculateDestinationInstructionPart(line){
//       let destinationInstructionPart = '';
//       let destinationString = 'null';
//       const indexOfEqualityOperator = line.indexOf('=');
//       if(indexOfEqualityOperator > -1){
//         destinationString = line.substring(0,indexOfEqualityOperator);
//       }
//       destinationInstructionPart = DESTINATION_TO_INSTRUCTION_PART_MAP[destinationString];
//       return destinationInstructionPart;
//     }
    
//     function calculateJumpInstructionPart(line){
//       let jumpInstructionPart = '';
//       let jumpString = 'null';
//       const indexOfJumpOperator = line.indexOf(';');
//       if(indexOfJumpOperator > -1){
//         jumpString = line.substring(indexOfJumpOperator + 1, line.length); 
//       }
//       jumpInstructionPart = JUMP_TO_INSTRUCTION_PART_MAP[jumpString];
//       return jumpInstructionPart;
//     }

//     createASMFile(instructionSet);
    
//     function createASMFile(instructionSet) {
//         if (fs.existsSync(fileName.substr(0,fileName.indexOf('.')) + '.asm')) {
//             fs.unlinkSync(fileName.substr(0,fileName.indexOf('.')) + '.asm');
//         }
//         for (var i = 0; i < instructionSet.length; i++) {
//             fs.appendFileSync(fileName.substr(0,fileName.indexOf('.')) + '.asm',instructionSet[i] + "\n");
//         }
//     }
// }

start()
