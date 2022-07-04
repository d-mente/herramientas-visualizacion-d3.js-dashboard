const app = Vue.createApp({
    template: `

    <AgeSelector :ages="allAges" @update:modelValue="handleAgesChange"/>
    <GraphColumnSelector @update:modelValue="handleColumnChange"/>
    <YearSelector @update:modelValue="handleYearChange"/>
    <center>
        <div id="graf"></div>
    </center>
    <StateSelector :entidades="allStates" @update:modelValue="handleStateChange" />
    `,
    data() {
        return {
            graf: null,
            // Dimensiones
            anchoTotal: 0,
            altoTotal: 0,
            margins: {
                top: 60,
                right: 20,
                bottom: 75,
                left: 100,
            },
            ancho: 0,
            alto: 0,
            // Elementos gráficos (layers)
            svg: null,
            layer: null,
            g: null,
            allData: [],
            xAccessor: null,
            y: null,
            x: null,
            color: null,
            titulo: null,

            // Render the chart

            allStates: [],
            allAges: [],

            selected: {
                year: 1990,
                variable: "total",
                ages: "No especificado",
                states: [],
            },
        };
    },
    beforeCreate() {
        // Escaladores
        // ...
    },
    async mounted() {
        // Carga de Datos
        this.allData = await d3.csv("Poblacion_01_Clean_Value.csv", d3.autoType);
        this.data = this.allData;

        // prepare entidades federativas
        this.allStates = this.allData
            .map((el) => el.entidadFederativa)
            .filter((value, index, self) => self.indexOf(value) === index && value !== "Estados Unidos Mexicanos");

        this.allAges = this.allData
            .map((el) => el.grupoQuincenalEdad)
            .filter((value, index, self) => self.indexOf(value) === index);

        this.graf = d3.select("#graf");
        this.anchoTotal = +this.graf.style("width").slice(0, -2) / 2;
        this.altoTotal = (this.anchoTotal * 9) / 16;
        this.ancho = this.anchoTotal - this.margins.left - this.margins.right;
        this.alto = this.altoTotal - this.margins.top - this.margins.bottom;
        // Elementos gráficos (layers)
        this.svg = this.graf
            .append("svg")
            .attr("width", this.anchoTotal)
            .attr("height", this.altoTotal)
            .attr("class", "graf");
        this.layer = this.svg.append("g").attr("transform", `translate(${this.margins.left}, ${this.margins.top})`);
        this.layer.append("rect").attr("height", this.alto).attr("width", this.ancho).attr("fill", "white");
        this.g = this.svg.append("g").attr("transform", `translate(${this.margins.left}, ${this.margins.top})`);

        // ------ draw
        // Accessor
        this.xAccessor = (d) => d.entidadFederativa;

        // Escaladores
        this.y = d3.scaleLinear().range([this.alto, 0]);
        this.color = d3.scaleOrdinal().domain(Object.keys(this.data[0]).slice(1)).range(d3.schemeDark2);
        this.x = d3.scaleBand().range([0, this.ancho]).paddingOuter(0.2).paddingInner(0.1);

        // Titulo de gráfico
        this.titulo = this.g
            .append("text")
            .attr("x", this.ancho / 2 - 65)
            .attr("y", -15)
            .classed("titulo", true);

        // Etiquetas de eje X
        this.etiquetas = this.g.append("g");

        // Ejes
        this.xAxisGroup = this.g.append("g").attr("transform", `translate(0, ${this.alto})`).classed("axis", true);
        this.yAxisGroup = this.g.append("g").classed("axis", true);

        // Accessor
        this.xAccessor = (d) => d.entidadFederativa;

        this.render();
    },
    methods: {
        render(params = {}) {
            this.selected.variable = params.variable || this.selected.variable;
            this.selected.year = params.year || this.selected.year;
            this.selected.ages = params.ages || this.selected.ages;
            this.selected.states = params.states || this.selected.states;

            const variable = this.selected.variable;

            this.data = this.allData.filter(
                (d) =>
                    d.Anio == this.selected.year &&
                    d.grupoQuincenalEdad == this.selected.ages &&
                    d.entidadFederativa != "Estados Unidos Mexicanos" &&
                    this.selected.states.includes(d.entidadFederativa)
            );

            // Títulos
            this.titulo.text(`Población ${variable} (${this.selected.year})`);

            // Accesoria
            const yAccessor = (d) => d[variable];
            this.data.sort((a, b) => yAccessor(b) - yAccessor(a));

            // Escaladores
            this.y.domain([0, d3.max(this.data, yAccessor)]);
            this.x.domain(d3.map(this.data, this.xAccessor));

            // Rectángulos (Elementos)
            const rect = this.g.selectAll("rect").data(this.data, this.xAccessor);
            rect.enter()
                .append("rect")
                .attr("x", (d) => this.x(this.xAccessor(d)))
                .attr("y", (d) => this.y(0))
                .attr("width", this.x.bandwidth())
                .attr("height", 0)
                .attr("fill", "green")
                .merge(rect)
                .transition()
                .duration(2500)
                // .ease(d3.easeBounce)
                .attr("x", (d) => this.x(this.xAccessor(d)))
                .attr("y", (d) => this.y(yAccessor(d)))
                .attr("width", this.x.bandwidth())
                .attr("height", (d) => this.alto - this.y(yAccessor(d)))
                .attr("fill", (d) => this.color(variable));

            // Imprimir etiquetas de Ejes
            const xAxis = d3.axisBottom(this.x);
            const yAxis = d3.axisLeft(this.y).ticks(8);
            this.xAxisGroup.transition().duration(2500).call(xAxis);
            this.yAxisGroup.transition().duration(2500).call(yAxis);
        },
        handleColumnChange(val) {
            this.render({ variable: val });
        },
        handleAgesChange(val) {
            this.render({ ages: val });
        },
        handleStateChange(val) {
            this.render({ states: val });
        },
        handleYearChange(val) {
            this.render({ year: val });
        },
    },
});

app.component("AgeSelector", {
    template: `
        <select class="form-select" v-model="selected" aria-label="Default select example" v-on:change="select($event)">
            <option :value="item" v-for="item in ages">{{item}}</option>
        </select>
    `,
    props: ["ages"],
    data() {
        return {
            selected: "No especificado",
        };
    },
    emits: ["update:modelValue"],
    methods: {
        select(event) {
            this.$emit("update:modelValue", event.target.value);
        },
    },
});

app.component("StateSelector", {
    template: `
        <div class="form-check form-check-inline" v-for="item in entidades">
            <input class="form-check-input" type="checkbox" :id="item" v-on:change="select($event)" :value="item" v-model="selected">
            <label class="form-check-label" :for="item">{{item}}</label>
        </div>
    `,
    props: ["entidades"],
    data() {
        return {
            selected: [],
        };
    },
    watch: {
        entidades: function (newVal, oldVal) {
            if (this.selected.length == 0 && newVal.length > 0) {
                let random = Math.floor(Math.random() * this.entidades.length);
                this.selected.push(this.entidades[random]);
                random = Math.floor(Math.random() * this.entidades.length);
                this.selected.push(this.entidades[random]);
                random = Math.floor(Math.random() * this.entidades.length);
                this.selected.push(this.entidades[random]);
                random = Math.floor(Math.random() * this.entidades.length);
                this.selected.push(this.entidades[random]);
                random = Math.floor(Math.random() * this.entidades.length);
                this.selected.push(this.entidades[random]);

                this.$emit("update:modelValue", this.selected);
            }
        },
    },
    emits: ["update:modelValue"],
    methods: {
        select(event) {
            this.$emit("update:modelValue", this.selected);
        },
    },
});

app.component("GraphColumnSelector", {
    template: `
        <div class="form-check form-check-inline">
            <input type="radio" id="total" name="column" value="total" v-model="selected" v-on:click="select($event)">
            <label for="total">Total</label>
        </div>
        <div class="form-check form-check-inline">
            <input type="radio" id="hombres" name="column" value="Hombres" v-model="selected" v-on:click="select($event)">
            <label for="hombres">Hombres</label>
        </div>
        <div class="form-check form-check-inline">
            <input type="radio" id="mujeres" name="column" value="Mujeres" v-model="selected" v-on:click="select($event)">
            <label for="mujeres">Mujeres</label>
        </div>
        `,
    data() {
        return {
            selected: "total",
        };
    },
    emits: ["update:modelValue"],

    methods: {
        select(event) {
            this.$emit("update:modelValue", event.target.value);
        },
    },
});

app.component("YearSelector", {
    template: `
        <div class="input-group">
            <div class=" btn-group">
                <a v-if="state == 'stop'" href="#" class="btn btn-primary" v-on:click="select('play')" >Play</a>
                <a v-if="state == 'pause'" href="#" class="btn btn-primary" v-on:click="select('continue')" >Continue</a>
                <a v-if="state == 'play'" href="#" class="btn btn-primary" v-on:click="select('pause')" >Pause</a>
                <a href="#" class="btn btn-primary" v-on:click="select('stop')" >Stop</a>
            </div>
        </div>
        
        <br>
        <div class="progress">
            <div class="progress-bar" role="progressbar" :style="[{width: percent +'%'}]" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">{{currentYear}}</div>
        </div>
        `,
    data() {
        return {
            state: "stop",

            years: [1990, 1995, 2000, 2005, 2010, 2020],
            percent: 0,
            currentYearPos: 0,
            currentYear: 1990,
            interval: null,
        };
    },
    emits: ["update:modelValue"],

    methods: {
        select(state) {
            if (state == "play") {
                this.interval = setInterval(() => {
                    if (this.state == "pause") return;
                    this.currentYearPos++;
                    this.currentYear = this.years[this.currentYearPos];
                    this.percent = Math.trunc((this.currentYearPos / (this.years.length - 1)) * 100);
                    this.$emit("update:modelValue", this.currentYear);

                    if (this.currentYearPos >= this.years.length) {
                        this.stop();
                    }
                }, 3000);
                this.state = "play";
            }

            if (state == "pause") {
                this.state = "pause";
            }

            if (state == "continue") {
                this.state = "play";
            }

            if (state == "stop") {
                this.stop();
            }
        },
        stop() {
            clearInterval(this.interval);
            this.state = "stop";
            this.currentYearPos = 0;
            this.currentYear = this.years[this.currentYearPos];
            this.percent = 0;
            this.$emit("update:modelValue", this.currentYear);
        },
    },
});

app.mount("#app");
