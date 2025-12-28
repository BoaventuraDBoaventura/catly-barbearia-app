
/**
 * Verifica se uma barbearia está aberta com base no horário e dias de Moçambique (GMT+2)
 * @param opening Horário de abertura (formato HH:mm)
 * @param closing Horário de fechamento (formato HH:mm)
 * @param openingDays Array de números representando os dias da semana (0=Domingo, 1=Segunda, etc)
 */
export function isShopOpen(opening?: string, closing?: string, openingDays?: number[]): boolean {
    if (!opening || !closing) return false;

    // Obter data e hora atual em Moçambique (GMT+2)
    const mozTime = new Date().toLocaleString("en-US", { timeZone: "Africa/Maputo" });
    const now = new Date(mozTime);

    // Verificar o dia da semana (0-6)
    if (openingDays && openingDays.length > 0) {
        const currentDay = now.getDay();
        if (!openingDays.includes(currentDay)) return false;
    }

    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    const [openH, openM] = opening.split(':').map(Number);
    const [closeH, closeM] = closing.split(':').map(Number);

    const openTimeInMinutes = openH * 60 + openM;
    const closeTimeInMinutes = closeH * 60 + closeM;

    // Se o horário de fechamento for menor que o de abertura, assumimos que fecha no dia seguinte
    if (closeTimeInMinutes < openTimeInMinutes) {
        return currentTimeInMinutes >= openTimeInMinutes || currentTimeInMinutes < closeTimeInMinutes;
    }

    return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes;
}
