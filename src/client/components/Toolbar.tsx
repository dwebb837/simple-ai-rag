import * as math from 'mathjs';
import { DropdownMenu, Button } from '@radix-ui/themes';

export default function Toolbar({
    onToolSelect,
    onClearHistory
}: {
    onToolSelect: (result: string) => void,
    onClearHistory: () => void
}) {
    const handleCalculation = (input: string) => {
        try {
            const result = math.evaluate(input);
            onToolSelect(`Calculation: ${input} = ${result}`);
        } catch (error) {
            onToolSelect(`Math Error: ${(error as Error).message}`);
        }
    };

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <Button variant="soft">
                    🧮 Tools
                </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content>
                <DropdownMenu.Item onClick={() => {
                    const equation = prompt("Enter math expression:");
                    equation && handleCalculation(equation);
                }}>
                    Calculator
                </DropdownMenu.Item>

                <DropdownMenu.Separator />

                <DropdownMenu.Item onClick={onClearHistory}>
                    🗑️ Clear History
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}
