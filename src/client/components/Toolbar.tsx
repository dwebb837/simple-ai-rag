import * as math from 'mathjs';
import { DropdownMenu, Button } from '@radix-ui/themes';

export default function Toolbar({ onToolSelect }: {
    onToolSelect: (result: string) => void
}) {
    const handleCalculation = async (input: string) => {
        try {
            const result = math.evaluate(input);
            onToolSelect(`Calculation Result: ${result}`);
        } catch (error) {
            onToolSelect(`Math Error: ${(error as Error).message}`);
        }
    };

    return (
        <div className="flex gap-2 mb-4">
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Button variant="soft">
                        🧮 Tools
                    </Button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Content>
                    <DropdownMenu.Item onClick={() => {
                        const equation = prompt("Enter math expression:");
                        if (equation) handleCalculation(equation);
                    }}>
                        Calculator
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    );
}
