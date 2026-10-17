// Teoría de cada lección (modo lectura). Generado desde teoria.py.
export const TEORIA = {
 "circuito": [
  {
   "tipo": "texto",
   "titulo": "¿Qué es un circuito eléctrico?",
   "parrafos": [
    "Un circuito eléctrico es un camino cerrado por el que puede circular la corriente eléctrica. La palabra viene de «circular»: la corriente da la vuelta completa y regresa al punto de donde salió.",
    "Todo circuito tiene cuatro tipos de elementos:",
    "• Una fuente de energía, como una batería o una pila. Da el empuje que pone a moverse las cargas.\n• Conductores, normalmente cables de cobre. Son el camino por donde viaja la corriente.\n• Receptores, como bombillos, resistencias o motores. Convierten la energía eléctrica en luz, calor o movimiento.\n• Elementos de control, como el interruptor. Abren o cierran el camino."
   ]
  },
  {
   "tipo": "clave",
   "texto": "La corriente solo circula si el camino está completamente cerrado: sale del borne + de la batería, atraviesa los componentes y vuelve por el borne −."
  },
  {
   "tipo": "analogia",
   "titulo": "Imagínalo como un circuito de agua",
   "texto": "Piensa en una bomba que empuja agua por una manguera que forma un anillo. La bomba es la batería, la manguera son los cables y una rueda de molino en el camino es el bombillo. Si cortas la manguera en cualquier punto, el agua deja de circular en todo el anillo, no solo en el corte."
  },
  {
   "tipo": "texto",
   "titulo": "Circuito abierto y circuito cerrado",
   "parrafos": [
    "Un circuito está cerrado cuando el camino no tiene interrupciones. Entonces circula corriente y los receptores funcionan.",
    "Un circuito está abierto cuando hay un corte en algún punto: un cable suelto, un bombillo fundido o un interruptor abierto. En un circuito abierto la corriente se detiene en todo el recorrido.",
    "El interruptor es simplemente una forma cómoda de abrir o cerrar el camino a voluntad. Al cerrarlo, sus dos contactos se tocan y la corriente puede pasar."
   ]
  },
  {
   "tipo": "texto",
   "titulo": "¿Hacia dónde va la corriente?",
   "parrafos": [
    "Por convención, decimos que la corriente sale del borne positivo (+) y regresa por el negativo (−). Este es el «sentido convencional», y es el que muestran las flechas y los puntos amarillos del simulador.",
    "En realidad, dentro de un cable de metal lo que se mueve son electrones, que tienen carga negativa y avanzan en sentido contrario, de − a +. Las dos descripciones dan los mismos resultados, así que se usa la convencional."
   ]
  },
  {
   "tipo": "ojo",
   "titulo": "Error común",
   "texto": "Pensar que basta con conectar un cable a la batería para que haya corriente. Un cable que sale del borne + y queda suelto no lleva corriente: no hay un camino de regreso. Y al revés, unir el + y el − directamente con un cable, sin nada en medio, es un cortocircuito: la corriente se vuelve enorme, el cable se calienta y la batería se daña."
  },
  {
   "tipo": "vida",
   "titulo": "En la vida real",
   "texto": "Cuando presionas el interruptor de la luz de tu cuarto, cierras un circuito que va desde la red eléctrica hasta el bombillo y de regreso. Al apagarlo, abres ese camino y la corriente se detiene."
  }
 ],
 "voltaje": [
  {
   "tipo": "texto",
   "titulo": "¿Qué es el voltaje?",
   "parrafos": [
    "El voltaje, también llamado tensión o diferencia de potencial, es el empuje eléctrico que pone en movimiento a las cargas. Lo produce la fuente: una pila, una batería o el enchufe de la casa.",
    "Más exactamente, el voltaje mide cuánta energía recibe cada unidad de carga al pasar por la fuente. Una batería de 9 V le da a cada culombio de carga 9 julios de energía, que luego se entregan en los componentes del circuito."
   ]
  },
  {
   "tipo": "formula",
   "formula": "1 V = 1 J / 1 C",
   "simbolos": [
    [
     "V",
     "voltio: la unidad del voltaje"
    ],
    [
     "J",
     "julio: la unidad de energía"
    ],
    [
     "C",
     "culombio: la unidad de carga eléctrica"
    ]
   ]
  },
  {
   "tipo": "analogia",
   "titulo": "Imagínalo como la altura de un tanque de agua",
   "texto": "Un tanque de agua colocado muy alto empuja el agua con más fuerza por la tubería que uno colocado a poca altura. El voltaje es como esa diferencia de altura: cuanto mayor es, con más fuerza empuja la corriente."
  },
  {
   "tipo": "clave",
   "texto": "El voltaje siempre se mide entre dos puntos. Una batería de 9 V significa que entre su borne + y su borne − hay 9 voltios de diferencia."
  },
  {
   "tipo": "texto",
   "titulo": "Valores que encuentras a diario",
   "parrafos": [
    "• Pila AA o AAA: 1.5 V\n• Pila cuadrada: 9 V\n• Batería de un carro: 12 V\n• Puerto USB: 5 V\n• Enchufe de la casa en Colombia: 110 a 120 V"
   ]
  },
  {
   "tipo": "texto",
   "titulo": "Voltaje y corriente",
   "parrafos": [
    "Si la resistencia del circuito no cambia, un empuje mayor produce una corriente mayor. La relación exacta la da la Ley de Ohm, que verás más adelante: I = V / R."
   ]
  },
  {
   "tipo": "ejemplo",
   "titulo": "Ejemplo resuelto",
   "enunciado": "Una pila de 3 V se conecta a una resistencia de 100 Ω. ¿Cuánta corriente circula?",
   "pasos": [
    "I = V / R",
    "I = 3 V / 100 Ω",
    "I = 0.03 A = 30 mA"
   ]
  },
  {
   "tipo": "ojo",
   "titulo": "Error común",
   "texto": "Decir que «el voltaje pasa por el cable». El voltaje no circula: es la diferencia de empuje entre dos puntos. Lo que circula es la corriente."
  },
  {
   "tipo": "vida",
   "titulo": "En la vida real",
   "texto": "Por eso un aparato de 12 V no se puede enchufar directamente a 120 V: recibiría un empuje diez veces mayor del que soporta. Los cargadores existen justamente para bajar el voltaje del enchufe al que necesita el aparato."
  }
 ],
 "corriente": [
  {
   "tipo": "texto",
   "titulo": "¿Qué es la corriente eléctrica?",
   "parrafos": [
    "La corriente eléctrica es el movimiento ordenado de cargas por un conductor. Su intensidad mide cuánta carga pasa por un punto del circuito en cada segundo.",
    "Se mide en amperios (A). Como en los circuitos pequeños las corrientes suelen ser menores que un amperio, también se usan los miliamperios (mA): 1 A = 1000 mA."
   ]
  },
  {
   "tipo": "formula",
   "formula": "I = Q / t",
   "simbolos": [
    [
     "I",
     "intensidad de corriente, en amperios (A)"
    ],
    [
     "Q",
     "carga que pasa, en culombios (C)"
    ],
    [
     "t",
     "tiempo, en segundos (s)"
    ]
   ]
  },
  {
   "tipo": "analogia",
   "titulo": "Imagínalo como el caudal de un río",
   "texto": "El caudal de un río dice cuántos litros de agua pasan por un punto cada segundo. La corriente dice cuánta carga eléctrica pasa por un punto del cable cada segundo. Un amperio equivale a unos 6 240 000 000 000 000 000 electrones por segundo."
  },
  {
   "tipo": "clave",
   "texto": "La corriente no se gasta. Toda la carga que sale de la batería regresa a ella. Lo que los componentes aprovechan es la energía que traen las cargas, no las cargas mismas."
  },
  {
   "tipo": "texto",
   "titulo": "Un solo camino, una sola corriente",
   "parrafos": [
    "Si el circuito tiene un único camino, las cargas no tienen hacia dónde desviarse: todas recorren el mismo lazo. Ningún punto del lazo puede acumular carga, así que por cada punto pasa la misma cantidad cada segundo.",
    "Para medir la corriente se usa un amperímetro, que se conecta en el camino, de modo que la corriente tenga que atravesarlo."
   ]
  },
  {
   "tipo": "ejemplo",
   "titulo": "Ejemplo resuelto",
   "enunciado": "Por un cable pasan 12 C de carga en 4 segundos. ¿Cuál es la corriente?",
   "pasos": [
    "I = Q / t",
    "I = 12 C / 4 s",
    "I = 3 A = 3000 mA"
   ]
  },
  {
   "tipo": "ojo",
   "titulo": "Error común",
   "texto": "Creer que el primer componente del camino «se come» parte de la corriente y al segundo le llega menos. En un solo camino la corriente es la misma antes, entre y después de los componentes. Lo que sí cambia de un punto a otro es el voltaje."
  },
  {
   "tipo": "vida",
   "titulo": "En la vida real",
   "texto": "Un LED usa unos 20 mA, un cargador de celular entrega de 1 a 2 A y una ducha eléctrica puede usar más de 30 A. Por eso los cables de la ducha son mucho más gruesos que los de una lámpara."
  }
 ],
 "resistencia": [
  {
   "tipo": "texto",
   "titulo": "¿Qué es la resistencia eléctrica?",
   "parrafos": [
    "La resistencia es la oposición que presenta un material al paso de la corriente. Todos los materiales tienen algo de resistencia: los conductores, como el cobre, tienen muy poca, y los aislantes, como el plástico, tienen muchísima.",
    "Se mide en ohmios (Ω). Para valores grandes se usan los kiloohmios: 1 kΩ = 1000 Ω."
   ]
  },
  {
   "tipo": "analogia",
   "titulo": "Imagínalo como un tubo estrecho",
   "texto": "Por un tubo ancho pasa mucha agua con poco esfuerzo. Por un tubo estrecho, con el mismo empuje, pasa mucha menos. Una resistencia grande es como un tubo estrecho para la corriente."
  },
  {
   "tipo": "texto",
   "titulo": "¿De qué depende?",
   "parrafos": [
    "La resistencia de un cable o de una pieza depende de cuatro cosas:",
    "• El material: el cobre y la plata conducen muy bien; el nicromo de los calentadores, no tanto.\n• La longitud: un cable más largo tiene más resistencia.\n• El grosor: un cable más grueso tiene menos resistencia.\n• La temperatura: en los metales, al calentarse aumenta la resistencia."
   ]
  },
  {
   "tipo": "formula",
   "formula": "R = V / I",
   "simbolos": [
    [
     "R",
     "resistencia, en ohmios (Ω)"
    ],
    [
     "V",
     "voltaje aplicado, en voltios (V)"
    ],
    [
     "I",
     "corriente que circula, en amperios (A)"
    ]
   ]
  },
  {
   "tipo": "clave",
   "texto": "Si el voltaje de la batería no cambia, cuanto mayor es la resistencia, menor es la corriente."
  },
  {
   "tipo": "texto",
   "titulo": "El código de colores",
   "parrafos": [
    "Las resistencias que se usan en electrónica traen bandas de colores que indican su valor. Las dos primeras bandas son dígitos y la tercera es el multiplicador (cuántos ceros se agregan).",
    "Por ejemplo, marrón (1), negro (0) y marrón (×10) forman 10 × 10 = 100 Ω. En el simulador libre puedes ver el código de cualquier resistencia al seleccionarla."
   ]
  },
  {
   "tipo": "ejemplo",
   "titulo": "Ejemplo resuelto",
   "enunciado": "Una batería de 9 V se conecta a una resistencia de 450 Ω. ¿Cuánta corriente circula?",
   "pasos": [
    "I = V / R",
    "I = 9 V / 450 Ω",
    "I = 0.02 A = 20 mA"
   ]
  },
  {
   "tipo": "ojo",
   "titulo": "Error común",
   "texto": "Pensar que la resistencia «gasta» la corriente. La resistencia limita cuánta corriente circula en todo el lazo, y convierte parte de la energía eléctrica en calor. Por eso las resistencias se calientan."
  },
  {
   "tipo": "vida",
   "titulo": "En la vida real",
   "texto": "Las planchas, tostadoras y duchas eléctricas funcionan con resistencias que se calientan a propósito. Y a cada LED se le pone una resistencia en serie para limitar su corriente y que no se queme."
  }
 ],
 "ohm": [
  {
   "tipo": "texto",
   "titulo": "La ley que une todo",
   "parrafos": [
    "En 1827, el físico alemán Georg Simon Ohm descubrió que en muchos materiales la corriente, el voltaje y la resistencia cumplen una relación muy sencilla. Hoy se conoce como la Ley de Ohm y es la herramienta más usada para calcular circuitos."
   ]
  },
  {
   "tipo": "formula",
   "formula": "V = I × R",
   "simbolos": [
    [
     "V",
     "voltaje, en voltios (V)"
    ],
    [
     "I",
     "corriente, en amperios (A)"
    ],
    [
     "R",
     "resistencia, en ohmios (Ω)"
    ]
   ]
  },
  {
   "tipo": "texto",
   "titulo": "Tres formas de la misma ley",
   "parrafos": [
    "Despejando, la misma ley sirve para encontrar cualquiera de las tres magnitudes si conoces las otras dos:",
    "• Para hallar la corriente: I = V / R\n• Para hallar el voltaje: V = I × R\n• Para hallar la resistencia: R = V / I",
    "Un truco para recordarlo es el triángulo: V arriba, I y R abajo. Tapa la magnitud que buscas y lo que queda te dice la operación."
   ]
  },
  {
   "tipo": "clave",
   "texto": "La corriente es directamente proporcional al voltaje e inversamente proporcional a la resistencia: sube cuando el empuje sube y baja cuando la oposición sube."
  },
  {
   "tipo": "texto",
   "titulo": "Cómo se ve en una gráfica",
   "parrafos": [
    "Si mantienes fija una resistencia y cambias el voltaje, los puntos (V, I) forman una recta que pasa por el origen. Mientras mayor es la resistencia, más acostada queda la recta. En el resultado de la lección verás esta gráfica con tus propias simulaciones."
   ]
  },
  {
   "tipo": "ejemplo",
   "titulo": "Ejemplo 1: hallar la corriente",
   "enunciado": "Batería de 9 V y resistencia de 300 Ω.",
   "pasos": [
    "I = V / R",
    "I = 9 V / 300 Ω",
    "I = 0.03 A = 30 mA"
   ]
  },
  {
   "tipo": "ejemplo",
   "titulo": "Ejemplo 2: hallar el voltaje",
   "enunciado": "Por una resistencia de 250 Ω circulan 20 mA.",
   "pasos": [
    "Primero se pasa a amperios: 20 mA = 0.02 A",
    "V = I × R",
    "V = 0.02 A × 250 Ω",
    "V = 5 V"
   ]
  },
  {
   "tipo": "ejemplo",
   "titulo": "Ejemplo 3: hallar la resistencia",
   "enunciado": "Con 12 V circula una corriente de 0.04 A.",
   "pasos": [
    "R = V / I",
    "R = 12 V / 0.04 A",
    "R = 300 Ω"
   ]
  },
  {
   "tipo": "ojo",
   "titulo": "Error común",
   "texto": "Mezclar unidades. Si la corriente está en miliamperios, hay que pasarla a amperios antes de usar la fórmula: 20 mA son 0.02 A, no 20 A."
  }
 ],
 "serie": [
  {
   "tipo": "texto",
   "titulo": "¿Qué es un circuito en serie?",
   "parrafos": [
    "En un circuito en serie los componentes se conectan uno tras otro, formando un único camino. La corriente que sale de la batería tiene que atravesar todos los componentes, uno después del otro, antes de regresar."
   ]
  },
  {
   "tipo": "clave",
   "texto": "Las tres reglas de la serie: la corriente es la misma en todos los componentes, el voltaje de la batería se reparte entre ellos y las resistencias se suman."
  },
  {
   "tipo": "formula",
   "formula": "Req = R1 + R2 + …",
   "simbolos": [
    [
     "Req",
     "resistencia equivalente: un solo componente que haría lo mismo que todos juntos"
    ],
    [
     "R1, R2",
     "las resistencias conectadas en serie"
    ]
   ]
  },
  {
   "tipo": "formula",
   "formula": "V = V1 + V2 + …",
   "simbolos": [
    [
     "V",
     "voltaje de la batería"
    ],
    [
     "V1, V2",
     "voltaje en cada componente. Esta es la ley de voltajes de Kirchhoff: en un lazo, las caídas suman lo que da la fuente"
    ]
   ]
  },
  {
   "tipo": "texto",
   "titulo": "¿Cómo se reparte el voltaje?",
   "parrafos": [
    "Como por todos pasa la misma corriente, cada componente toma un voltaje V = I × R. Es decir, el reparto no es en partes iguales: depende del valor de cada resistencia. A esto se le llama divisor de voltaje."
   ]
  },
  {
   "tipo": "ejemplo",
   "titulo": "Ejemplo resuelto",
   "enunciado": "Una batería de 9 V con R1 = 100 Ω y R2 = 350 Ω en serie.",
   "pasos": [
    "Req = 100 Ω + 350 Ω = 450 Ω",
    "I = V / Req = 9 V / 450 Ω = 0.02 A = 20 mA",
    "V1 = I × R1 = 0.02 A × 100 Ω = 2 V",
    "V2 = I × R2 = 0.02 A × 350 Ω = 7 V",
    "Comprobación: 2 V + 7 V = 9 V"
   ]
  },
  {
   "tipo": "ojo",
   "titulo": "Error común",
   "texto": "Pensar que agregar un componente en serie no afecta a los demás. Cada resistencia nueva aumenta la resistencia equivalente, así que baja la corriente de todo el circuito."
  },
  {
   "tipo": "vida",
   "titulo": "En la vida real",
   "texto": "Algunas instalaciones de luces navideñas antiguas estaban en serie: si un solo bombillo se fundía, se abría el único camino y se apagaba toda la instalación. Las pilas de un control remoto también van en serie, para sumar sus voltajes."
  }
 ],
 "paralelo": [
  {
   "tipo": "texto",
   "titulo": "¿Qué es un circuito en paralelo?",
   "parrafos": [
    "En un circuito en paralelo cada componente forma su propia rama, y todas las ramas se conectan entre los mismos dos puntos. La corriente que sale de la batería llega a un punto de unión, llamado nodo, y allí se divide entre las ramas. Luego las ramas se vuelven a juntar antes de regresar a la batería."
   ]
  },
  {
   "tipo": "clave",
   "texto": "Las tres reglas del paralelo: todas las ramas reciben el mismo voltaje, la corriente total se reparte entre las ramas y la resistencia equivalente es menor que la de la rama más pequeña."
  },
  {
   "tipo": "formula",
   "formula": "I = I1 + I2 + …",
   "simbolos": [
    [
     "I",
     "corriente total que entrega la batería"
    ],
    [
     "I1, I2",
     "corriente de cada rama. Es la ley de corrientes de Kirchhoff: lo que entra a un nodo es igual a lo que sale"
    ]
   ]
  },
  {
   "tipo": "formula",
   "formula": "1/Req = 1/R1 + 1/R2 + …",
   "simbolos": [
    [
     "Req",
     "resistencia equivalente del conjunto"
    ],
    [
     "Para dos ramas",
     "también se puede usar Req = (R1 × R2) / (R1 + R2)"
    ]
   ]
  },
  {
   "tipo": "texto",
   "titulo": "Cada rama sigue su propia Ley de Ohm",
   "parrafos": [
    "Como cada rama tiene el voltaje completo de la batería, la corriente de cada rama se calcula por separado: I rama = V / R rama. Compara los valores de las resistencias y piensa qué rama deja pasar más.",
    "Agregar una rama nueva abre otro camino para la corriente. Por eso, en paralelo, cada rama extra baja la resistencia equivalente y aumenta la corriente total que entrega la batería."
   ]
  },
  {
   "tipo": "ejemplo",
   "titulo": "Ejemplo resuelto",
   "enunciado": "Una batería de 6 V con R1 = 30 Ω y R2 = 60 Ω en paralelo.",
   "pasos": [
    "I1 = 6 V / 30 Ω = 0.2 A",
    "I2 = 6 V / 60 Ω = 0.1 A",
    "I = 0.2 A + 0.1 A = 0.3 A",
    "1/Req = 1/30 + 1/60 = 3/60, entonces Req = 20 Ω",
    "Comprobación: 6 V / 20 Ω = 0.3 A"
   ]
  },
  {
   "tipo": "ojo",
   "titulo": "Error común",
   "texto": "Sumar las resistencias en paralelo como si estuvieran en serie. En paralelo el resultado siempre es menor que la resistencia más pequeña: con 30 Ω y 60 Ω el equivalente es 20 Ω, no 90 Ω."
  },
  {
   "tipo": "vida",
   "titulo": "En la vida real",
   "texto": "Los enchufes y las lámparas de una casa están en paralelo. Así cada aparato recibe los 120 V completos y, si apagas uno, los demás siguen funcionando. El breaker se dispara cuando conectas demasiados aparatos a la vez, porque la corriente total crece con cada rama."
  }
 ],
 "potencia": [
  {
   "tipo": "texto",
   "titulo": "¿Qué es la potencia eléctrica?",
   "parrafos": [
    "La potencia es la cantidad de energía que un componente recibe y transforma cada segundo. Un bombillo la transforma en luz y calor; un motor, en movimiento; una resistencia, en calor.",
    "Se mide en vatios (W). Un vatio es un julio de energía por segundo."
   ]
  },
  {
   "tipo": "formula",
   "formula": "P = V × I",
   "simbolos": [
    [
     "P",
     "potencia, en vatios (W)"
    ],
    [
     "V",
     "voltaje en el componente, en voltios (V)"
    ],
    [
     "I",
     "corriente por el componente, en amperios (A)"
    ]
   ]
  },
  {
   "tipo": "texto",
   "titulo": "Combinada con la Ley de Ohm",
   "parrafos": [
    "Si reemplazas V o I usando la Ley de Ohm, obtienes otras dos formas útiles:",
    "• P = I² × R, cuando conoces la corriente.\n• P = V² / R, cuando conoces el voltaje.",
    "Fíjate en que el voltaje aparece al cuadrado en la última fórmula. Piensa qué significa eso cuando el voltaje cambia."
   ]
  },
  {
   "tipo": "clave",
   "texto": "En un bombillo, más potencia significa más brillo. La potencia depende tanto del voltaje como de la corriente."
  },
  {
   "tipo": "ejemplo",
   "titulo": "Ejemplo resuelto",
   "enunciado": "Un bombillo de 10 Ω conectado a una batería de 4 V.",
   "pasos": [
    "I = V / R = 4 V / 10 Ω = 0.4 A",
    "P = V × I = 4 V × 0.4 A = 1.6 W",
    "Comprobación: P = V² / R = 16 / 10 = 1.6 W"
   ]
  },
  {
   "tipo": "texto",
   "titulo": "Energía y la factura de la luz",
   "parrafos": [
    "La energía total depende de la potencia y del tiempo: E = P × t. La empresa de energía cobra en kilovatios-hora (kWh). Un bombillo de 100 W encendido 10 horas consume 100 W × 10 h = 1000 Wh = 1 kWh."
   ]
  },
  {
   "tipo": "ojo",
   "titulo": "Error común",
   "texto": "Pensar que más resistencia siempre significa más potencia. Con el voltaje fijo, P = V² / R: una resistencia mayor deja pasar menos corriente y recibe menos potencia."
  },
  {
   "tipo": "vida",
   "titulo": "En la vida real",
   "texto": "La potencia viene impresa en casi todos los aparatos: un cargador de celular usa unos 10 a 20 W, un televisor unos 100 W y una ducha eléctrica de 3000 a 5000 W."
  }
 ],
 "serie_paralelo": [
  {
   "tipo": "texto",
   "titulo": "Los mismos componentes, dos comportamientos",
   "parrafos": [
    "Con los mismos bombillos y la misma batería puedes armar circuitos que se comportan de forma muy distinta. Lo que cambia es la forma de conectarlos: uno tras otro (serie) o cada uno en su propia rama (paralelo)."
   ]
  },
  {
   "tipo": "texto",
   "titulo": "Comparación de las reglas",
   "parrafos": [
    "• Corriente: en serie es la misma en todos. En paralelo se reparte entre las ramas.\n• Voltaje: en serie se reparte entre los componentes. En paralelo cada rama recibe el voltaje completo de la batería.\n• Resistencia equivalente: en serie se suman y aumenta. En paralelo disminuye.\n• Si un componente falla: en serie se apaga todo. En paralelo las demás ramas siguen funcionando."
   ]
  },
  {
   "tipo": "clave",
   "texto": "El brillo de un bombillo depende de la potencia que recibe, y la potencia depende del voltaje que le llega: P = V² / R."
  },
  {
   "tipo": "formula",
   "formula": "P = V² / R",
   "simbolos": [
    [
     "P",
     "potencia que recibe cada bombillo"
    ],
    [
     "V",
     "voltaje que llega a ese bombillo, no necesariamente el de la batería"
    ],
    [
     "R",
     "resistencia del bombillo"
    ]
   ]
  },
  {
   "tipo": "texto",
   "titulo": "Piénsalo antes de simular",
   "parrafos": [
    "Con dos bombillos iguales en serie, ¿cuánto voltaje recibe cada uno? ¿Y cuánto recibe cada uno si están en paralelo? Con la fórmula de la potencia puedes adivinar qué pasará con el brillo. Lo comprobarás en la simulación."
   ]
  },
  {
   "tipo": "texto",
   "titulo": "Circuitos mixtos",
   "parrafos": [
    "Muchos circuitos reales combinan las dos formas: algunas partes en serie y otras en paralelo. Se resuelven por partes, reemplazando cada grupo en serie o en paralelo por su resistencia equivalente. El simulador libre puede resolver cualquier combinación."
   ]
  },
  {
   "tipo": "vida",
   "titulo": "En la vida real",
   "texto": "Las casas se cablean en paralelo para que cada aparato reciba el voltaje completo y funcione de forma independiente. Las pilas de una linterna se ponen en serie para sumar sus voltajes."
  }
 ]
};
export const teoriaDe = (clave) => TEORIA[clave] || null;
